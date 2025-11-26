import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { VideoUploader } from '../components/VideoUploader';
export default function VideoUpload() {
    return (_jsxs("div", { className: "px-4 sm:px-6 lg:px-8", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 dark:text-white", children: "Upload Video" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400 mt-2", children: "Upload and share videos with metadata and geographic restrictions" })] }), _jsx(VideoUploader, {})] }));
}
