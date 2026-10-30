export const ENROLLMENT_BRANCHES = [
    "MCA",
    "MBA",
    "CSE",
    "AIML",
    "IS",
    "EC",
    "MECH",
    "CIVIL"
] as const;

export type EnrollmentBranch = (typeof ENROLLMENT_BRANCHES)[number];

export function isEnrollmentBranch(value: string): value is EnrollmentBranch {
    return ENROLLMENT_BRANCHES.some(branch => branch === value);
}

export const ENROLLMENT_STUDY_YEARS: Record<EnrollmentBranch, readonly number[]> = {
    MCA: [1, 2],
    MBA: [1, 2],
    CSE: [1, 2, 3, 4],
    AIML: [1, 2, 3, 4],
    IS: [1, 2, 3, 4],
    EC: [1, 2, 3, 4],
    MECH: [1, 2, 3, 4],
    CIVIL: [1, 2, 3, 4]
};

export function isStudyYearAllowed(branch: string, studyYear: number) {
    return isEnrollmentBranch(branch) && ENROLLMENT_STUDY_YEARS[branch].includes(studyYear);
}

export function getStudyYearLabel(studyYear: number) {
    const ordinal = ["1st", "2nd", "3rd", "4th"][studyYear - 1];
    return ordinal ? `${ordinal} Year` : "Not recorded";
}
