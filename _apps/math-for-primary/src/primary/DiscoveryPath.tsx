import {Icon} from '../ui/Icon';
import {TopicPreview} from './TopicPreview';
import {activityById} from './catalog';
import type {LessonMeta} from '../teach/index';
/** Three connected entry points for one idea, without inventing a completion score. */
export function DiscoveryPath({lesson}:{lesson?:LessonMeta}){
 if(!lesson)return null;
 const activity=activityById(lesson.activityId);
 return <section className="discovery-path" aria-label="Explore one idea three ways"><div className="discovery-path-heading"><div><p className="primary-eyebrow">ONE IDEA. THREE LITTLE STEPS.</p><h3>{lesson.title}</h3></div>{activity&&<TopicPreview kind={activity.kind}/>}</div><div className="discovery-path-steps"><a href={`#/watch/${lesson.id}`}><span className="discovery-step-icon"><Icon name="play" filled/></span><span><strong>See it</strong><small>Listen & explore the picture</small></span><Icon name="arrowRight" size={17}/></a><a href={`#/teach/${lesson.id}`}><span className="discovery-step-icon"><Icon name="book"/></span><span><strong>Build it</strong><small>Try with a little guidance</small></span><Icon name="arrowRight" size={17}/></a>{activity&&<a href={`#/activity/${activity.id}`}><span className="discovery-step-icon"><Icon name="sparkle"/></span><span><strong>Try it</strong><small>Make the idea your own</small></span><Icon name="arrowRight" size={17}/></a>}</div></section>;
}
