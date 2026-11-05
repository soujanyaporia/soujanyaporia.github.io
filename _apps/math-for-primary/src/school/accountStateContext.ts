import {createContext} from 'react';

export interface SchoolUser {id:string;schoolId:string;username:string;name:string;role:'student'|'teacher'|'admin';mustChange:boolean;schoolName:string;schoolCode:string;demo:boolean}
export interface SchoolClass {id:string;name:string;level:number;year:number;track:string}
export type Connection='online'|'offline'|'unreachable';
export interface AccountApi {register:(schoolName:string,name:string,email:string,password:string)=>Promise<void>;classes:SchoolClass[];user:SchoolUser|null;token:string|null;loading:boolean;error:string;connection:Connection;api:(path:string,method?:string,body?:unknown)=>Promise<any>;login:(schoolCode:string,username:string,password:string)=>Promise<void>;logout:()=>Promise<void>;refresh:()=>Promise<void>;retry:()=>void;continueAsGuest:()=>void}

// This module has no runtime content imports: generator edits must not replace
// the context object used by the mounted account provider.
export const AccountStateContext=createContext<AccountApi|null>(null);
