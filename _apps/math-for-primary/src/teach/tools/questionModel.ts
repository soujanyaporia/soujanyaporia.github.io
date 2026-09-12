import type {Tool} from '../model';
/** Keep the supplied quantities visible, but save calculated summaries for feedback. */
export function questionModel(tool:Tool):Tool {
 if(tool.kind==='focus')return {...tool,hideValue:true,source:questionModel(tool.source)};
 if(tool.kind==='bar'&&tool.labels?.length&&tool.labels.every(label=>label==='x'))return {...tool,hideValue:true,parts:tool.parts.map(()=>null)};
 return {...tool,hideValue:true};
}
