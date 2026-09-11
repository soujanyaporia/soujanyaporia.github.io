import { Component,lazy,type ComponentType,type ReactNode } from 'react';
/** Load a screen's code on demand, retrying once for a dropped connection. */
export function lazyScreen<P extends object>(load:()=>Promise<ComponentType<P>>){
 return lazy(async()=>{try{return {default:await load()};}catch{await new Promise(r=>setTimeout(r,900));return {default:await load()};}});
}
const chunkFailure=(e:Error)=>/dynamically imported module|Importing a module script failed|Loading (CSS )?chunk|Failed to fetch/i.test(e.message);
/** Keeps one broken screen from blanking the app. Resets when the route changes. */
export class RouteBoundary extends Component<{children:ReactNode;resetKey:string},{error:Error|null}>{
 state={error:null as Error|null};
 static getDerivedStateFromError(error:Error){return {error};}
 componentDidUpdate(prev:{resetKey:string}){if(prev.resetKey!==this.props.resetKey&&this.state.error)this.setState({error:null});}
 componentDidCatch(error:Error){console.error('Screen failed to render:',error.name);}
 render(){
  const e=this.state.error;if(!e)return this.props.children;const chunk=chunkFailure(e);
  return <main className="school-page route-problem" role="alert"><p className="school-eyebrow">Something needs a moment</p><h1>{chunk?'This part of the app did not load.':'Something went wrong on this screen.'}</h1><p>{chunk?'Check the connection and reload. If the app has just been updated, reloading fetches the new version.':'Your saved work is safe. Try again, or go back to your activities.'}</p><div className="loading-actions">{!chunk&&<button className="btn" onClick={()=>this.setState({error:null})}>Try again</button>}<button className={chunk?'btn':'btn btn-soft'} onClick={()=>window.location.reload()}>Reload the page</button><a href="#/">Back to activities</a></div></main>;
 }
}
export function RouteLoading({label}:{label:string}){return <main className="route-loading" aria-busy="true"><span className="route-spinner" aria-hidden="true"/><p role="status">{label}</p></main>;}
