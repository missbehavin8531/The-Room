import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

export function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

export function formatDateTime(dateString) {
    if (!dateString) return '';
    return `${formatDate(dateString)} at ${formatTime(dateString)}`;
}

export function formatRelativeTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(dateString);
}

export function getInitials(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    
    // Handle various YouTube URL formats
    let videoId = null;
    
    // youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/[?&]v=([^&]+)/);
    if (watchMatch) videoId = watchMatch[1];
    
    // youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch) videoId = shortMatch[1];
    
    // youtube.com/embed/VIDEO_ID
    const embedMatch = url.match(/youtube\.com\/embed\/([^?&]+)/);
    if (embedMatch) videoId = embedMatch[1];
    
    // Playlist URL
    const playlistMatch = url.match(/[?&]list=([^&]+)/);
    if (playlistMatch) {
        return `https://www.youtube.com/embed/videoseries?list=${playlistMatch[1]}`;
    }
    
    if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
    }
    
    return null;
}

export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileIcon(fileType) {
    switch (fileType) {
        case 'pdf':
            return 'FileText';
        case 'ppt':
            return 'Presentation';
        case 'image':
            return 'Image';
        default:
            return 'File';
    }
}

export function truncate(str, length = 100) {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.slice(0, length) + '...';
}

export function getRoleBadgeClass(role) {
    switch (role) {
        case 'admin':
            return 'bg-red-100 text-red-800';
        case 'teacher':
            return 'bg-blue-100 text-blue-800';
        default:
            return 'bg-green-100 text-green-800';
    }
}
