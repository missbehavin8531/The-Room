import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { X, Download, ExternalLink, FileText, Presentation, Image, Loader2 } from 'lucide-react';
import { formatFileSize } from '../lib/utils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function getAuthUrl(resourceId) {
    var token = localStorage.getItem('token');
    return BACKEND_URL + '/api/resources/' + resourceId + '/download?token=' + token;
}

export const FilePreview = ({ resource, open, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    if (!resource) return null;

    const downloadUrl = getAuthUrl(resource.id);
    
    const getIcon = () => {
        switch (resource.file_type) {
            case 'pdf': return FileText;
            case 'ppt': return Presentation;
            case 'image': return Image;
            default: return FileText;
        }
    };

    const Icon = getIcon();

    const renderPreview = () => {
        if (resource.file_type === 'pdf') {
            return (
                <div className="relative w-full h-[70vh] bg-muted rounded-xl overflow-hidden">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    )}
                    <iframe
                        src={`${downloadUrl}#toolbar=0`}
                        className="w-full h-full"
                        onLoad={() => setLoading(false)}
                        onError={() => { setLoading(false); setError(true); }}
                        title={resource.original_filename}
                    />
                </div>
            );
        }

        if (resource.file_type === 'ppt') {
            // Use Microsoft Office Online viewer for PPT files
            const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(downloadUrl)}`;
            return (
                <div className="relative w-full h-[70vh] bg-muted rounded-xl overflow-hidden">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    )}
                    <iframe
                        src={viewerUrl}
                        className="w-full h-full"
                        onLoad={() => setLoading(false)}
                        onError={() => { setLoading(false); setError(true); }}
                        title={resource.original_filename}
                        frameBorder="0"
                    />
                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
                            <Presentation className="w-16 h-16 text-muted-foreground/30 mb-4" />
                            <p className="text-muted-foreground mb-4">Preview not available for this file</p>
                            <a href={downloadUrl} download>
                                <Button className="btn-primary">
                                    <Download className="w-4 h-4 mr-2" />
                                    Download to View
                                </Button>
                            </a>
                        </div>
                    )}
                </div>
            );
        }

        if (resource.file_type === 'image') {
            return (
                <div className="relative w-full flex items-center justify-center bg-muted rounded-xl overflow-hidden p-4">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    )}
                    <img
                        src={downloadUrl}
                        alt={resource.original_filename}
                        className="max-w-full max-h-[70vh] object-contain rounded-lg"
                        onLoad={() => setLoading(false)}
                        onError={() => { setLoading(false); setError(true); }}
                    />
                </div>
            );
        }

        // Fallback for unsupported types
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <Icon className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground mb-4">Preview not available for this file type</p>
                <a href={downloadUrl} download>
                    <Button className="btn-primary">
                        <Download className="w-4 h-4 mr-2" />
                        Download File
                    </Button>
                </a>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-[95vw]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 pr-8">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold truncate">{resource.original_filename}</p>
                            <p className="text-sm text-muted-foreground font-normal">
                                {formatFileSize(resource.file_size)} • {resource.file_type.toUpperCase()}
                            </p>
                        </div>
                    </DialogTitle>
                </DialogHeader>
                
                <div className="mt-4">
                    {renderPreview()}
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open in New Tab
                        </Button>
                    </a>
                    <a href={downloadUrl} download>
                        <Button className="btn-primary">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                        </Button>
                    </a>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default FilePreview;
