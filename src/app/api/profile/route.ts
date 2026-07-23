import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUsers, saveUsers } from '@/lib/users';

type Body = Record<string, unknown>;
const clean = (value: unknown) => typeof value === 'string' ? value.trim() : '';
function validateUrl(value:string, field:string, errors:Record<string,string>) { if(!value) return ''; try { const url=new URL(value); if(!['http:','https:'].includes(url.protocol)) errors[field]='Liên kết phải bắt đầu bằng http:// hoặc https://.'; return value; } catch { errors[field]='Liên kết không hợp lệ.'; return value; } }

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ok:false,message:'Đạo hữu cần đăng nhập.'},{status:401});
  try {
    const body = await request.json() as Body;
    const displayName=clean(body.displayName), bio=clean(body.bio), location=clean(body.location), discord=clean(body.discord);
    const errors:Record<string,string>={};
    if(!displayName) errors.displayName='Tên hiển thị không được để trống.'; else if(displayName.length>60) errors.displayName='Tên hiển thị không được vượt quá 60 ký tự.';
    if(bio.length>500) errors.bio='Giới thiệu không được vượt quá 500 ký tự.';
    if(location.length>80) errors.location='Vị trí không được vượt quá 80 ký tự.';
    if(discord.length>100) errors.discord='Discord không được vượt quá 100 ký tự.';
    const website=validateUrl(clean(body.website),'website',errors), facebook=validateUrl(clean(body.facebook),'facebook',errors), youtube=validateUrl(clean(body.youtube),'youtube',errors), github=validateUrl(clean(body.github),'github',errors), steam=validateUrl(clean(body.steam),'steam',errors);
    if(Object.keys(errors).length) return NextResponse.json({ok:false,message:'Một số thông tin chưa hợp lệ.',errors},{status:400});
    const users=await getUsers(); const index=users.findIndex(u=>u.id===currentUser.id);
    if(index<0) return NextResponse.json({ok:false,message:'Không tìm thấy tài khoản.'},{status:404});
    const existing=users[index].profile;
    users[index]={...users[index],profile:{displayName,avatar:existing?.avatar,coverImage:existing?.coverImage,coverPosition:existing?.coverPosition??{x:50,y:50},bio,location,website,socialLinks:{facebook,youtube,discord,github,steam}},updatedAt:new Date().toISOString()};
    await saveUsers(users);
    return NextResponse.json({ok:true,message:'Đạo tịch đã được cập nhật thành công.',profile:users[index].profile});
  } catch(error) {
    console.error('Không thể cập nhật hồ sơ:',error);
    return NextResponse.json({ok:false,message:error instanceof Error?error.message:'Không thể cập nhật đạo tịch.'},{status:500});
  }
}

