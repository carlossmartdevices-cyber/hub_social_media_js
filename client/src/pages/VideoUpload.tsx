import { VideoUploader } from '../components/VideoUploader';

export default function VideoUpload() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Upload Video</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Upload and share videos with metadata and geographic restrictions
        </p>
      </div>

      <VideoUploader />
    </div>
  );
}
