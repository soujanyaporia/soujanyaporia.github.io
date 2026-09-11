export const API_URL = import.meta.env.VITE_SCHOOL_API || 'https://math-for-primary-school-api.soujanya-poria.chatgpt.site';
export class ApiError extends Error { constructor(public status:number,message:string,public data:any){super(message)} }
/** No response reached us (offline, DNS, timeout). Work stays pending and is retried. */
export class NetworkError extends Error {}
export async function apiRequest(path:string,token:string|null,method='GET',body?:unknown){
 let r:Response;
 try{r=await fetch(API_URL+'/api'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});}
 catch{throw new NetworkError('We could not reach the school service. Check the connection; your work is kept on this device.');}
 let data;try{data=await r.json()}catch{throw new ApiError(r.status,'The school service is temporarily unavailable. Guest play is still available.',null);}
 if(!r.ok)throw new ApiError(r.status,data?.error||'Request failed.',data);return data;
}
