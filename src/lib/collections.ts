import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CollectionItem, ModCollection } from './types';
import { readJson, writeJson } from './json-store';

const collectionsPath = path.join(process.cwd(), 'data', 'collections.json');
const collectionItemsPath = path.join(process.cwd(), 'data', 'collection-items.json');

function slugify(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'bo-suu-tap';
}
export async function getCollections(): Promise<ModCollection[]> { return readJson<ModCollection[]>(collectionsPath, []); }
export async function saveCollections(collections: ModCollection[]): Promise<void> { await writeJson(collectionsPath, collections); }
export async function getCollectionItems(): Promise<CollectionItem[]> { return readJson<CollectionItem[]>(collectionItemsPath, []); }
export async function saveCollectionItems(items: CollectionItem[]): Promise<void> { await writeJson(collectionItemsPath, items); }
export async function getCollectionById(id: string): Promise<ModCollection | undefined> { return (await getCollections()).find((item) => item.id === id); }
export async function getCollectionBySlug(slug: string): Promise<ModCollection | undefined> { return (await getCollections()).find((item) => item.slug === slug); }
export async function getCollectionsByOwnerId(ownerId: string): Promise<ModCollection[]> {
  return (await getCollections()).filter((item) => item.ownerId === ownerId).sort((a,b)=>new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime());
}
export async function createCollection(input: { ownerId: string; title: string; description: string; visibility: 'PUBLIC'|'PRIVATE' }): Promise<ModCollection> {
  const collections=await getCollections(); const baseSlug=slugify(input.title); let slug=baseSlug; let suffix=2;
  while(collections.some((item)=>item.slug===slug)){ slug=`${baseSlug}-${suffix}`; suffix+=1; }
  const now=new Date().toISOString();
  const collection: ModCollection={ id: randomUUID(), ownerId: input.ownerId, title: input.title, slug, description: input.description, visibility: input.visibility, moderationStatus:'VISIBLE', createdAt:now, updatedAt:now };
  collections.push(collection); await saveCollections(collections); return collection;
}
export async function updateCollection(collectionId:string, requesterId:string, requesterIsAdmin:boolean, input:{ title:string; description:string; visibility:'PUBLIC'|'PRIVATE' }):Promise<ModCollection|null>{
  const collections=await getCollections(); const index=collections.findIndex((item)=>item.id===collectionId);
  if(index<0 || (collections[index].ownerId!==requesterId && !requesterIsAdmin)) return null;
  collections[index]={...collections[index],...input,updatedAt:new Date().toISOString()}; await saveCollections(collections); return collections[index];
}
export async function deleteCollection(collectionId:string, requesterId:string, requesterIsAdmin:boolean):Promise<boolean>{
  const collections=await getCollections(); const collection=collections.find((item)=>item.id===collectionId);
  if(!collection || (collection.ownerId!==requesterId && !requesterIsAdmin)) return false;
  await saveCollections(collections.filter((item)=>item.id!==collectionId));
  await saveCollectionItems((await getCollectionItems()).filter((item)=>item.collectionId!==collectionId)); return true;
}
export async function getCollectionItemsByCollectionId(collectionId:string):Promise<CollectionItem[]>{
  return (await getCollectionItems()).filter((item)=>item.collectionId===collectionId).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
}
export async function getCollectionItemCountMap():Promise<Record<string,number>>{
  const result:Record<string,number>={}; for(const item of await getCollectionItems()) result[item.collectionId]=(result[item.collectionId]??0)+1; return result;
}
export async function getCollectionsContainingModForUser(modId:string, ownerId:string):Promise<string[]>{
  const [collections,items]=await Promise.all([getCollectionsByOwnerId(ownerId),getCollectionItems()]); const ids=new Set(collections.map((item)=>item.id));
  return items.filter((item)=>item.modId===modId && ids.has(item.collectionId)).map((item)=>item.collectionId);
}
export async function toggleCollectionItem(collectionId:string, modId:string, userId:string):Promise<{added:boolean}>{
  const collection=await getCollectionById(collectionId); if(!collection || collection.ownerId!==userId) throw new Error('Forbidden');
  const items=await getCollectionItems(); const index=items.findIndex((item)=>item.collectionId===collectionId && item.modId===modId); let added=false;
  if(index>=0) items.splice(index,1); else { items.push({collectionId,modId,addedByUserId:userId,createdAt:new Date().toISOString()}); added=true; }
  await saveCollectionItems(items); const collections=await getCollections(); const ci=collections.findIndex((item)=>item.id===collectionId);
  if(ci>=0){collections[ci]={...collections[ci],updatedAt:new Date().toISOString()}; await saveCollections(collections);} return {added};
}
