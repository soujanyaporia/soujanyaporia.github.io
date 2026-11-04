/** Content availability is separate from a pupil's completion or mastery. */
export function CurriculumAvailability({lesson,activity}:{lesson:boolean;activity:boolean}){
 return <span className="curriculum-availability">
  <span className={`status-pill ${lesson?'taught':'mapped'}`}>{lesson?'Lesson available':'Lesson not yet added'}</span>
  {activity&&<span className="status-pill available">Practice activity</span>}
 </span>;
}
