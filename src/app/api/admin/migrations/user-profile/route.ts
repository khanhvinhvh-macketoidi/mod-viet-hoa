import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { migrateUsers } from '@/lib/migrations';

const statePath = path.join(process.cwd(),'data','migrations','user-profile-v1.json');
type State={migration:'user-profile-v1';completedAt:string;completedByUserId:string;result:Awaited<ReturnType<typeof migrateUsers>>};

async function readState():Promise<State|null>{try{return JSON.parse(await fs.readFile(statePath,'utf8')) as State}catch(error){if(error instanceof Error&&'code'in error&&error.code==='ENOENT')return null;throw error}}
async function writeState(state:State){await fs.mkdir(path.dirname(statePath),{recursive:true});await fs.writeFile(statePath,JSON.stringify(state,null,2),'utf8')}
async function admin(){const user=await getCurrentUser();if(!user)return{user:null,response:NextResponse.json({ok:false,message:'Đạo hữu cần đăng nhập.'},{status:401})};if(user.role!=='ADMIN')return{user:null,response:NextResponse.json({ok:false,message:'Đạo hữu không có quyền thực hiện thao tác này.'},{status:403})};return{user,response:null}}

export async function GET(){const auth=await admin();if(auth.response)return auth.response;try{const state=await readState();return NextResponse.json({ok:true,completed:Boolean(state),state})}catch(error){console.error(error);return NextResponse.json({ok:false,message:'Không thể đọc trạng thái migration.'},{status:500})}}
export async function POST(){const auth=await admin();if(auth.response||!auth.user)return auth.response;try{const existing=await readState();if(existing)return NextResponse.json({ok:false,completed:true,message:'Migration này đã được chạy trước đó.',state:existing},{status:409});const result=await migrateUsers();const state:State={migration:'user-profile-v1',completedAt:new Date().toISOString(),completedByUserId:auth.user.id,result};await writeState(state);return NextResponse.json({ok:true,completed:true,message:'Migration User Profile đã hoàn tất.',state})}catch(error){console.error(error);return NextResponse.json({ok:false,message:error instanceof Error?error.message:'Migration thất bại.'},{status:500})}}
