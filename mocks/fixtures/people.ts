// People fixtures (FE-1.8): sections A–C with 16 students each, 2 faculty, a not-yet-onboarded student.
import type { FacultyProfile, SessionUser, StudentProfile } from "@/contracts/auth";
import type { Section } from "@/contracts/common";
import { BRANCH, CURRENT_SEMESTER, SECTIONS, subjectByCode } from "./curriculum";
import { mockId } from "./ids";

const branchRef = { id: BRANCH.id, code: BRANCH.code, name: BRANCH.name };

const NAMES: Record<Section, string[]> = {
  A: [
    "Aarav Sharma", "Ananya Iyer", "Vivaan Patel", "Ishita Reddy", "Kabir Mehta", "Saanvi Gupta", "Arjun Nair", "Meera Joshi",
    "Rohan Das", "Priya Kulkarni", "Aditya Rao", "Kavya Menon", "Siddharth Jain", "Tanvi Desai", "Nikhil Verma", "Riya Bose",
  ],
  B: [
    "Aryan Singh", "Diya Kapoor", "Reyansh Pillai", "Anika Chatterjee", "Krish Malhotra", "Navya Shetty", "Dhruv Agarwal", "Pooja Hegde",
    "Yash Thakur", "Sneha Pandey", "Harsh Vardhan", "Aditi Banerjee", "Manav Sinha", "Ira Choudhury", "Varun Bhat", "Nisha Rawat",
  ],
  C: [
    "Ayaan Khan", "Myra D'Souza", "Ishaan Mishra", "Sara Fernandes", "Parth Saxena", "Avni Trivedi", "Rudra Yadav", "Khushi Arora",
    "Om Prakash", "Jiya Ghosh", "Laksh Tiwari", "Zara Ahmed", "Vihaan Kohli", "Tara Mukherjee", "Neel Sengupta", "Esha Bhatt",
  ],
};

const emailOf = (name: string) =>
  `${name.toLowerCase().replace(/[^a-z ]/g, "").trim().replace(/\s+/g, ".")}@nodus.demo`;

export type MockStudent = { user: SessionUser; profile: StudentProfile };

export const students: MockStudent[] = SECTIONS.flatMap((section) =>
  NAMES[section].map((name) => {
    const id = mockId(`student:${name}`);
    return {
      user: { id, name, email: emailOf(name), image: null, role: "student" as const },
      profile: { userId: id, branch: branchRef, currentSemester: CURRENT_SEMESTER, section },
    };
  }),
);

/** The student you are signed in as in mock mode (section A). */
export const DEMO_STUDENT = students[0];

/** Signed-up student without a profile — use to build the onboarding flow (cookie `nodus-mock-role=new-student`). */
export const NEW_STUDENT: SessionUser = {
  id: mockId("student:new"),
  name: "Dev Malhotra",
  email: "dev.malhotra@nodus.demo",
  image: null,
  role: "student",
};

export type MockFaculty = { user: SessionUser; profile: FacultyProfile };

function faculty(name: string, teaches: [code: string, sections: Section[]][]): MockFaculty {
  const id = mockId(`faculty:${name}`);
  return {
    user: { id, name, email: emailOf(name.replace(/^(Dr|Prof)\.\s*/, "")), image: null, role: "faculty" },
    profile: {
      userId: id,
      branch: branchRef,
      teaches: teaches.map(([code, sections]) => {
        const subject = subjectByCode(code);
        return {
          subjectId: subject.id,
          subjectCode: subject.code,
          subjectName: subject.name,
          semesterNumber: subject.semesterNumber,
          sections,
        };
      }),
    },
  };
}

export const facultyMembers: MockFaculty[] = [
  faculty("Dr. Meera Iyer", [
    ["CS301", ["A", "B", "C"]],
    ["CS305", ["A", "B", "C"]],
  ]),
  faculty("Prof. Rohan Kulkarni", [
    ["CS302", ["A", "B", "C"]],
    ["CS303", ["A", "B"]],
    ["CS304", ["A", "B", "C"]],
  ]),
];

/** The faculty you are signed in as with cookie `nodus-mock-role=faculty`. */
export const DEMO_FACULTY = facultyMembers[0];

/** Who teaches a subject (first match) — used for "uploaded by" / "created by". */
export function teacherOf(subjectId: string): MockFaculty {
  return facultyMembers.find((f) => f.profile.teaches.some((t) => t.subjectId === subjectId)) ?? DEMO_FACULTY;
}
