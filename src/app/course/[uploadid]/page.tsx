// /course/[uploadid]/page.tsx

import { notFound } from 'next/navigation';

interface CourseModule {
  id: string;
  course_title: string;
  topic: string;
  description: string;
  learning_objectives: string[];
  recommended_resources: string[];
}

async function getCourseModules(uploadid: string): Promise<CourseModule[]> {
  const res = await fetch(`https://680e3ff2c47cb8074d92884a.mockapi.io/courses?uploadid=${uploadid}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch course data');
  }

  const data = await res.json();
  return data;
}

export default async function CoursePage({ params }: { params: { uploadid: string } }) {
  const { uploadid } = params;

  let courseModules: CourseModule[] = [];
  try {
    courseModules = await getCourseModules(uploadid);
  } catch (error) {
    notFound();
  }

  if (courseModules.length === 0) {
    notFound();
  }

  const courseTitle = courseModules[0]?.course_title ?? 'Personalized Course';

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">{courseTitle}</h1>

      {courseModules.map((module) => (
        <div key={module.id} className="mb-8 p-4 border rounded-lg shadow">
          <h2 className="text-2xl font-semibold">{module.topic}</h2>
          <p className="mt-2">{module.description}</p>

          <div className="mt-4">
            <h3 className="font-semibold">Learning Objectives:</h3>
            <ul className="list-disc ml-6">
              {module.learning_objectives.map((obj, idx) => (
                <li key={idx}>{obj}</li>
              ))}
            </ul>
          </div>

          <div className="mt-4">
            <h3 className="font-semibold">Recommended Resources:</h3>
            <ul className="list-disc ml-6">
              {module.recommended_resources.map((res, idx) => (
                <li key={idx}>
                  {idx === 0 ? (
                    <a href={res} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      Watch Video
                    </a>
                  ) : (
                    <span>{res}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
