import {lessonPractice} from '../teach/lessonPractice';
import {Icon} from '../ui/Icon';
import {TopicPreview} from './TopicPreview';
import {activityById} from './catalog';
import type {LessonMeta} from '../teach/index';
/** Three connected entry points for one idea, without inventing a completion score. */
export function DiscoveryPath({lesson}:{lesson?:LessonMeta}){
 if(!lesson)return null;
 const activity=activityById(lesson.activityId),practice=lessonPractice(lesson);
 return <section className="discovery-path" aria-label={practice?.exact?'Explore one idea three ways':'Explore this lesson and related practice'}><div className="discovery-path-heading"><div><p className="primary-eyebrow">{practice?.exact?'ONE IDEA. THREE LITTLE STEPS.':'KEEP EXPLORING.'}</p><h3>{lesson.title}</h3></div>{activity&&<TopicPreview kind={activity.kind}/>}</div><div className="discovery-path-steps"><a href={`#/watch/${lesson.id}`}><span className="discovery-step-icon"><Icon name="play" filled/></span><span><strong>See it</strong><small>Listen & explore the picture</small></span><Icon name="arrowRight" size={17}/></a><a href={`#/teach/${lesson.id}`}><span className="discovery-step-icon"><Icon name="book"/></span><span><strong>Build it</strong><small>Try with a little guidance</small></span><Icon name="arrowRight" size={17}/></a>{activity&&<a href={`#/activity/${activity.id}`}><span className="discovery-step-icon"><Icon name="sparkle"/></span><span><strong>{practice?.exact?'Practise':'Related practice'}</strong><small>{activity.title}</small></span><Icon name="arrowRight" size={17}/></a>}</div></section>;
}
