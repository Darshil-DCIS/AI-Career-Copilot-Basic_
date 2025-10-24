
import React from 'react';

interface ResumePreviewProps {
  resumeText: string;
}

const ResumePreview: React.FC<ResumePreviewProps> = ({ resumeText }) => {
  return (
    <div className="h-[46rem] bg-slate-900/70 border border-slate-700 rounded-md p-4 overflow-y-auto">
      <div className="max-w-3xl mx-auto bg-white text-black p-12 shadow-2xl" style={{ fontFamily: 'Georgia, serif' }}>
        <pre className="whitespace-pre-wrap text-sm leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
          {resumeText || "Your resume preview will appear here..."}
        </pre>
      </div>
    </div>
  );
};

export default ResumePreview;
