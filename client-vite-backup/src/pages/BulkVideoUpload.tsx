import { BulkVideoUploader } from '../components/BulkVideoUploader';

export default function BulkVideoUpload() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bulk Video Upload</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Upload and publish up to 6 videos at once with AI-powered content generation
        </p>
      </div>

      <BulkVideoUploader />
    </div>
  );
}
