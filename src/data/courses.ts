export type CourseVideo = {
  id: string;
  title: string;
  date: string;
  locked?: boolean;
  link?: string; // YouTube watch URL
};

export const courseVideos: Record<string, CourseVideo[]> = {
  "ls-dang-cs": [
    { id: "v1", title: "Tâm lý học 1.1", date: "07-09-2025",  link: "https://youtu.be/4huT1hfzRkg?si=ASpvwQLWGx1ftOv4" },
    { id: "v2", title: "Tâm lý học 1.2", date: "08-09-2025", link :"https://youtu.be/gBgnSC-6PNc?si=PXde79Whtsbe9Lgg" },
    { id: "v3", title: "Tâm lý học 1.3", date: "14-09-2025",  link :"https://youtu.be/Te8jKVLoD9M?si=kLwEiGLmMzSqls6k" },
    { id: "v4", title: "Tâm lý học 1.4", date: "15-09-2025",  link :"https://youtu.be/Te8jKVLoD9M?si=kLwEiGLmMzSqls6k" },
    { id: "v5", title: "Tâm lý học 2.1", date: "28-09-2025",  link :"https://youtu.be/Te8jKVLoD9M?si=kLwEiGLmMzSqls6k"},
    { id: "v6", title: "Tâm lý học 2.2", date: "29-09-2025",  link :"https://youtu.be/Te8jKVLoD9M?si=kLwEiGLmMzSqls6k"},
    { id: "v7", title: "Tâm lý học 2.3", date: "05-10-2025",  link :"https://youtu.be/Te8jKVLoD9M?si=kLwEiGLmMzSqls6k"},
    { id: "v8", title: "Tâm lý học 3.1", date: "06-10-2025",  link :"https://youtu.be/Te8jKVLoD9M?si=kLwEiGLmMzSqls6k"},
    { id: "v9", title: "Tâm lý học 3.2", date: "12-10-2025", link :"https://youtu.be/Te8jKVLoD9M?si=kLwEiGLmMzSqls6k"},
    { id: "v10", title: "Tâm lý học 3.3", date: "13-10-2025",  link :"https://youtu.be/Te8jKVLoD9M?si=kLwEiGLmMzSqls6k"},
    { id: "v11", title: "Tâm lý học 3.4", date: "13-10-2025" },
  ],
  "tu-tuong-hcm": [
    { id: "v1", title: "[Tư tưởng HCM] 1", date: "26-02-2025", link: "https://www.youtube.com/watch?v=151s" },
    { id: "v2", title: "Câu hỏi video 1", date: "26-02-2025" },
    { id: "v3", title: "[Tư tưởng HCM] 2.1", date: "27-02-2025" },
    { id: "v4", title: "Câu hỏi video 2", date: "27-02-2025" },
    { id: "v5", title: "[Tư tưởng HCM] 2.2", date: "05-03-2025" },
  ],
  "lap-trinh-web": [
    { id: "v1", title: "Web Project Setup", date: "20-09-2025", link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    { id: "v2", title: "React Basics", date: "27-09-2025" },
  ],
};

export const courseTitles: Record<string, string> = {
  "ls-dang-cs": "Tâm lý học",
  "tu-tuong-hcm": "Tư tưởng Hồ Chí Minh",
  "lap-trinh-web": "Quản lí mã nguồn dự án Web",
};

export function youtubeWatchToEmbed(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    const id = u.searchParams.get("v");
    if (id) return `https://www.youtube.com/embed/${id}?modestbranding=1&rel=0`;
    // fallback for youtu.be/<id>
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/embed${u.pathname}?modestbranding=1&rel=0`;
  } catch {}
  return undefined;
}
