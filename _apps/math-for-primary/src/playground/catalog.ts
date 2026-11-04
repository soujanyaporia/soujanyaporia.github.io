import type { GameKind } from '../primary/catalog';
import type { Track } from '../school/curriculum';
export type MissionKind='count'|'bond'|'jump'|'take'|'groups'|'clock'|'array'|'share'|'fraction'|'bar'|'equivalent'|'area'|'perimeter'|'remainder'|'decimal'|'hundred'|'angle'|'mirror'|'factor'|'percent'|'discount'|'volume'|'triangle'|'fraction-set'|'ratio'|'ratio-share'|'balance'|'average'|'percent-change';
export interface Mission {id:string;level:number;track:Track;kind:MissionKind;title:string;about:string;preview:GameKind;parameter?:string;}
type Entry=[MissionKind,string,string,GameKind,string?];
const sets:Record<string,Entry[]>={
 '1S':[
 ['count','Firefly keeper','Fill the frames with just enough glowing counters.','count'],
 ['bond','Build a number nest','Move counters to make two parts of one whole.','bond'],
 ['jump','River-hop rescue','Land on the right stone with forward and backward jumps.','add'],
 ['take','Picnic pack-up','Take away the eaten snacks and count what stays.','subtract'],
 ['groups','Garden gathering','Make equal groups for the garden.','groups'],
 ['clock','A day with Pip','Set the clock for each part of Pip’s day.','clock']],
 '2S':[
 ['array','Orchard architect','Plant rows and columns to match the order.','multiply'],
 ['groups','Times-table workshop','Build equal groups of 2, 3, 4, 5 or 10.','groups','tables'],
 ['share','Fair-share café','Give every guest the same number of counters.','share'],
 ['fraction','Pizza painter','Shade equal slices to fill the order.','fractionShade'],
 ['clock','Minute makers','Set both hands to the time on the ticket.','clock'],
 ['bar','Market model maker','Build the two parts of a shopping total.','add']],
 '3S':[
 ['equivalent','Fraction bridge','Make two different fractions cover the same length.','fractionEquivalent'],
 ['area','Garden tile studio','Design a rectangle with the requested area.','area'],
 ['perimeter','Fence workshop','Build a rectangle with the right boundary length.','perimeter'],
 ['remainder','Leftover picnic','Share fairly and leave only the remainder.','remainder'],
 ['clock','24-hour station','Turn a 24-hour departure time into a clock face.','clock'],
 ['bar','Story-bar builders','Represent a two-part story using a bar.','add']],
 '4S':[
 ['decimal','Decimal sculptor','Build numbers with ones, tenths and hundredths.','decimalPlace'],
 ['hundred','Decimal mosaics','Turn a decimal into shaded hundredths.','fractionDecimal'],
 ['angle','Protractor workshop','Open the angle to the requested number of degrees.','angleType'],
 ['mirror','Mirror meadow','Place both points equally far from the mirror.','symmetry'],
 ['factor','Factor gardens','Arrange a total into equal rows and columns.','factor'],
 ['equivalent','Fraction connections','Link equivalent fractions with different denominators.','fractionEquivalent']],
 '5S':[
 ['percent','Percentage studio','Choose a percentage to reach a target amount.','percent'],
 ['discount','Sale-sign makers','Shade the discount, rather than the price paid.','discount'],
 ['volume','Cube city','Build a cuboid with the required volume.','volume'],
 ['triangle','Triangle transformation','Join two matching triangles to explain their area.','triangleArea'],
 ['angle','Straight-line secrets','Build the missing angle on a straight line.','angleFacts','straight'],
 ['fraction-set','Collection curator','Make a fraction of a collection using equal groups.','fractionSet']],
 '6S':[
 ['ratio','Recipe remix','Build the stated ratio from equal units.','ratio'],
 ['ratio-share','Treasure shares','Use equal units to share a total in a given ratio.','ratioShare'],
 ['balance','Balance detective','Keep both sides equal until one unknown remains.','equation'],
 ['volume','Missing dimension','Find dimensions that fit the volume and depth.','volumeMissing'],
 ['average','Fair-value festival','Redistribute a total into equal shares to show the average.','average'],
 ['percent-change','Price-change studio','Model a percentage increase or decrease.','percentChange']],
 '5F':[
 ['decimal','Decimal sculptor','Build decimals one place at a time.','decimalPlace'],
 ['array','Product orchard','Build a multiplication using rows and columns.','multiply'],
 ['equivalent','Fraction bridge','Shade two strips to show equivalent fractions.','fractionEquivalent'],
 ['area','Garden tile studio','Count rows of squares to build an area.','area'],
 ['angle','Straight-line secrets','Use 180° to find the missing angle.','angleFacts','straight'],
 ['volume','Cube-stack studio','Build a solid and count its unit cubes.','volume']],
 '6F':[
 ['percent','Percentage studio','Build a percentage of a whole amount.','percent'],
 ['share','Fraction-share café','Share equally to represent division.','fractionDivide','fraction'],
 ['volume','Cube city','Build a cuboid from its dimensions and volume.','volume'],
 ['triangle','Triangle transformation','Use two triangles to make a rectangle.','triangleArea'],
 ['average','Fair-value festival','Find the average by sharing the total equally.','average'],
 ['decimal','Decimal sculptor','Build a decimal with three decimal places.','decimalPlace']],
};
export const MISSIONS:Mission[]=Object.entries(sets).flatMap(([path,entries])=>entries.map(([kind,title,about,preview,parameter])=>({id:`p${path.toLowerCase()}-${kind}`,level:Number(path[0]),track:path[1]==='F'?'foundation':'standard',kind,title,about,preview,parameter})));
export const missionsFor=(level:number,track:Track)=>MISSIONS.filter(m=>m.level===level&&m.track===(level<5?'standard':track));
export const missionById=(id:string)=>MISSIONS.find(m=>m.id===id);
export const MISSION_ROUNDS=4;
