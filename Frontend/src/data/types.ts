/**
 * Academic course or subject model representing a registered curriculum item.
 */
export interface Subject {
  /** Unique subject identifier (MongoDB ObjectId or local unique ID) */
  id: string;
  /** Full name of the subject, e.g. "Data Structures & Algorithms" */
  name: string;
  /** Short course code, e.g. "CS301" */
  code: string;
  /** Total scheduled classes across the entire semester */
  totalClasses: number;
  /** Number of classes conducted strictly till now (excluding future dates & holidays) */
  conductedClasses?: number;
  /** Number of conducted classes marked as attended ('present') */
  attendedClasses: number;
  /** Number of conducted classes missed ('absent') */
  missedClasses: number;
  /** Hex color code used for badges and card accents, e.g. "#6366f1" */
  color: string;
  /** Academic credits assigned to this subject (e.g. 4) */
  credits?: number;
  /** Professor or faculty instructor name */
  instructor?: string;
}

/**
 * Weekly recurring class session belonging to an academic subject.
 */
export interface ClassSession {
  /** Unique class session identifier */
  id: string;
  /** Associated subject ID reference */
  subjectId: string;
  /** Name of the subject */
  subjectName: string;
  /** Scheduled weekday: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' */
  day: string;
  /** Scheduled time window string, formatted as "HH:MM - HH:MM" (e.g. "09:00 - 10:00") */
  time: string;
  /** Classroom, lecture hall, or lab room location (e.g. "Room 204", "LH-1") */
  room: string;
  /** Session format: 'lecture' | 'lab' | 'tutorial' */
  type: 'lecture' | 'lab' | 'tutorial';
  /** Start date of recurring schedule (YYYY-MM-DD); newly created sessions default to real-time today */
  startDate?: string;
  /** End date until which this session recurs weekly (YYYY-MM-DD) */
  endDate?: string;
}

/**
 * Holiday or suspended class date.
 */
export interface Holiday {
  /** Unique holiday identifier */
  id: string;
  /** Calendar date of the holiday formatted as YYYY-MM-DD */
  date: string;
  /** Description or occasion name, e.g. "Gandhi Jayanti", "Diwali Break" */
  label: string;
  /** 'full-day' applies to all classes; 'class-specific' cancels only the selected classSession */
  type: 'full-day' | 'class-specific';
  /** Associated class session ID if type is 'class-specific' */
  classId?: string;
}

/**
 * Examination schedule entry.
 */
export interface Exam {
  /** Unique exam identifier */
  id: string;
  /** Subject name for this exam */
  subjectName: string;
  /** Assessment type: 'end-sem' | 'mid-sem' | 'quiz' | 'assignment' */
  type: 'end-sem' | 'mid-sem' | 'quiz' | 'assignment';
  /** Exam date in YYYY-MM-DD format */
  date: string;
  /** Exam time window, e.g. "10:00 - 13:00" */
  time: string;
  /** Examination hall or room */
  room: string;
  /** Summary of topics or syllabus covered in this examination */
  syllabus: string;
  /** Current status: 'upcoming' | 'completed' | 'missed' */
  status: 'upcoming' | 'completed' | 'missed';
}

/**
 * Personal reflection or journal blog post created by the student.
 */
export interface BlogPost {
  /** Unique blog post identifier */
  id: string;
  /** Post headline title */
  title: string;
  /** Full markdown/text body content */
  content: string;
  /** Student's emotional mood when writing: 'great' | 'good' | 'okay' | 'tough' */
  mood: 'great' | 'good' | 'okay' | 'tough';
  /** Subject or category tag, e.g. "Study", "Coding", "Reflection" */
  category?: string;
  /** Estimated reading duration string, e.g. "3 min read" */
  readTime?: string;
  /** Gradient styling string for card presentation */
  coverGradient?: string;
  /** Optional cover image URL */
  image?: string;
  /** Human-readable publication time string */
  time?: string;
  /** Topic tags */
  tags: string[];
  /** ISO creation timestamp */
  createdAt: string;
  /** ISO last updated timestamp */
  updatedAt: string;
}

/**
 * Actionable task or todo item.
 */
export interface TodoItem {
  /** Unique todo identifier */
  id: string;
  /** Task description text */
  text: string;
  /** Whether the task has been marked completed */
  completed: boolean;
  /** 'daily' resets daily; 'permanent' persists until completed */
  type: 'daily' | 'permanent';
  /** Task priority level: 'high' | 'medium' | 'low' */
  priority?: 'high' | 'medium' | 'low';
  /** ISO timestamp when created */
  createdAt: string;
  /** ISO timestamp when marked completed */
  completedAt?: string;
}

/**
 * Habit item tracked across days.
 */
export interface HabitItem {
  /** Unique habit identifier */
  id: string;
  /** Name of the habit, e.g. "Read 20 pages", "Workout" */
  text: string;
  /** Emoji or Phosphor icon representation */
  icon: string;
  /** Accent color hex code */
  color: string;
  /** Date key (YYYY-MM-DD) mapped to boolean completion status */
  completionHistory: Record<string, boolean>;
  /** Whether 7 days have passed since creation or last edit */
  isEditable?: boolean;
  /** Days remaining until the next edit window opens */
  daysRemainingForEdit?: number;
  /** ISO timestamp of creation or last edit */
  lastEditedAt?: string;
}

/**
 * Milestone or accomplishment within an ambition goal.
 */
export interface AmbitionAchievement {
  /** Unique achievement milestone identifier */
  id: string;
  /** Text description of the achievement milestone */
  text: string;
  /** Date the milestone was recorded (YYYY-MM-DD) */
  date: string;
}

/**
 * Ambition or career/personal goal tracked by the student.
 */
export interface Ambition {
  /** Unique ambition identifier */
  id: string;
  /** Title of the ambition */
  title: string;
  /** Detailed description or motivation */
  description: string;
  /** Goal scope: 'long-term' | 'short-term' | 'one-month' */
  type: 'long-term' | 'short-term' | 'one-month';
  /** Target completion date (YYYY-MM-DD) */
  deadline?: string;
  /** Progress percentage (0 - 100) */
  progress?: number;
  /** List of logged milestone achievements */
  achievements?: AmbitionAchievement[];
  /** Lifecycle status: 'active' | 'achieved' | 'dropped' */
  status: 'active' | 'achieved' | 'dropped';
  /** ISO timestamp when created */
  createdAt: string;
}

/**
 * Individual attendance record logged for a subject on a specific date.
 */
export interface AttendanceRecord {
  /** Unique record identifier (MongoDB _id or local ID) */
  id?: string;
  /** Date of the class occurrence (YYYY-MM-DD) */
  date: string;
  /** Subject identifier this attendance belongs to */
  subjectId: string;
  /** Specific class session identifier if linked to a recurring slot */
  classId?: string;
  /** Attendance outcome: 'present' | 'absent' */
  status: 'present' | 'absent';
}

/**
 * Authenticated student user profile information.
 */
export interface UserProfile {
  /** Full name of the student */
  name: string;
  /** University or college roll / registration number */
  rollNo: string;
  /** Academic email address */
  email: string;
  /** Major or engineering branch, e.g. "Computer Science & Engineering" */
  branch: string;
  /** Current semester, e.g. "Semester 5" */
  semester: string;
  /** Class section or batch, e.g. "Section A" */
  section: string;
  /** Profile avatar image URL */
  photo: string;
}

/**
 * Validity bounds for the student's current semester schedule.
 */
export interface ScheduleValidity {
  /** Semester starting date (YYYY-MM-DD) */
  startDate: string;
  /** Semester ending date (YYYY-MM-DD) */
  endDate: string;
  /** Descriptive label, e.g. "Autumn Semester 2026" */
  label?: string;
}

/**
 * Root state interface for the application store.
 */
export interface AppState {
  /** Whether the student is actively authenticated */
  isLoggedIn: boolean;
  /** Student profile details */
  user: UserProfile;
  /** List of registered academic subjects */
  subjects: Subject[];
  /** List of scheduled weekly class sessions */
  schedule: ClassSession[];
  /** Optional semester validity bounds */
  scheduleValidity?: ScheduleValidity;
  /** List of scheduled academic holidays */
  holidays: Holiday[];
  /** List of scheduled examinations */
  exams: Exam[];
  /** List of journal blog posts */
  blogs: BlogPost[];
  /** List of pending and completed tasks */
  todos: TodoItem[];
  /** List of daily tracked habits */
  habits: HabitItem[];
  /** List of personal and career ambition goals */
  ambitions: Ambition[];
  /** Historical log of all recorded attendances */
  attendanceHistory: AttendanceRecord[];
  /** Today's active attendance marking state (classId -> status) */
  todayClassAttendance: Record<string, 'present' | 'absent'>;
  /** Date for which todayClassAttendance is active (YYYY-MM-DD) */
  todayClassAttendanceDate: string;
}
