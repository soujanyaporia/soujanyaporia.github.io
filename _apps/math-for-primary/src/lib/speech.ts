import {playNarration,stopNarration} from '../media/narration';
export {speechText} from './speechText';
export const canSpeak=typeof window!=='undefined'&&typeof Audio!=='undefined';
export function speak(text:string):void{if(canSpeak)playNarration(text);}
export function stopSpeaking():void{stopNarration();}
