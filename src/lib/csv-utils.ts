import { Student } from "@/types/student";
import { Course } from "@/types/course";
import { Faculty } from "@/types/faculty";

/**
 * Convert array of objects to CSV format
 */
function arrayToCSV<T extends Record<string, any>>(data: T[]): string {
    if (data.length === 0) return '';

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Create CSV header row
    const headerRow = headers.join(',');

    // Create data rows
    const dataRows = data.map(item => {
        return headers.map(header => {
            const value = item[header];
            // Escape commas and quotes
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        }).join(',');
    });

    return [headerRow, ...dataRows].join('\n');
}

/**
 * Trigger download of CSV file
 */
function downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

/**
 * Export students to CSV
 */
export function exportStudentsToCSV(students: Student[]) {
    const csv = arrayToCSV(students);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `students_export_${timestamp}.csv`);
}

/**
 * Export courses to CSV
 */
export function exportCoursesToCSV(courses: Course[]) {
    const csv = arrayToCSV(courses);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `courses_export_${timestamp}.csv`);
}

/**
 * Export faculty to CSV
 */
export function exportFacultyToCSV(faculty: Faculty[]) {
    const csv = arrayToCSV(faculty);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `faculty_export_${timestamp}.csv`);
}

/**
 * Generic export function
 */
export function exportToCSV<T extends Record<string, any>>(
    data: T[],
    filename: string
) {
    const csv = arrayToCSV(data);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `${filename}_${timestamp}.csv`);
}
