import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { coursesAPI } from '../lib/api';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import {
    X, Loader2, Upload, Image, Calendar, ListOrdered, Eye, EyeOff
} from 'lucide-react';

export const CourseEditor = ({ course, onClose, onSuccess }) => {
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    
    const [formData, setFormData] = useState({
        title: course.title || '',
        description: course.description || '',
        thumbnail_url: course.thumbnail_url || '',
        is_published: course.is_published || false,
        unlock_type: course.unlock_type || 'sequential',
    });
    
    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
    const handleCoverUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }
        
        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }
        
        setUploading(true);
        try {
            const res = await coursesAPI.uploadCover(course.id, file);
            updateField('thumbnail_url', res.data.thumbnail_url);
            toast.success('Cover image uploaded');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to upload cover');
        } finally {
            setUploading(false);
        }
    };
    
    const handleSave = async () => {
        if (!formData.title.trim() || !formData.description.trim()) {
            toast.error('Title and description are required');
            return;
        }
        
        setSaving(true);
        try {
            await coursesAPI.update(course.id, formData);
            toast.success('Course updated');
            onSuccess?.({ ...course, ...formData });
            onClose?.();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update course');
        } finally {
            setSaving(false);
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl animate-fade-in shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
                <CardHeader className="border-b flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <CardTitle>Edit Course</CardTitle>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </CardHeader>
                
                <CardContent className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Cover Image */}
                    <div className="space-y-3">
                        <Label>Cover Image</Label>
                        <div className="flex items-start gap-4">
                            <div className="w-32 h-20 rounded-lg border-2 border-dashed border-muted overflow-hidden flex items-center justify-center bg-muted/30">
                                {formData.thumbnail_url ? (
                                    <img 
                                        src={formData.thumbnail_url} 
                                        alt="Course cover" 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Image className="w-8 h-8 text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex-1 space-y-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleCoverUpload}
                                    className="hidden"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    data-testid="upload-cover-btn"
                                >
                                    {uploading ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4 mr-2" />
                                    )}
                                    Upload Image
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                    Or paste a URL below. Max 5MB for uploads.
                                </p>
                                <Input
                                    value={formData.thumbnail_url}
                                    onChange={(e) => updateField('thumbnail_url', e.target.value)}
                                    placeholder="https://..."
                                    className="text-sm"
                                    data-testid="cover-url-input"
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Course Title *</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => updateField('title', e.target.value)}
                            placeholder="e.g., Foundations of Faith"
                            data-testid="course-title-input"
                        />
                    </div>
                    
                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => updateField('description', e.target.value)}
                            placeholder="What will students learn in this course?"
                            rows={4}
                            data-testid="course-description-input"
                        />
                    </div>
                    
                    {/* Unlock Type */}
                    <div className="space-y-3">
                        <Label>Lesson Unlock Mode</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => updateField('unlock_type', 'sequential')}
                                className={cn(
                                    "p-4 rounded-xl border-2 transition-all text-left",
                                    formData.unlock_type === 'sequential'
                                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                        : "border-muted hover:border-primary/50"
                                )}
                                data-testid="unlock-sequential"
                            >
                                <ListOrdered className={cn(
                                    "w-6 h-6 mb-2",
                                    formData.unlock_type === 'sequential' ? "text-primary" : "text-muted-foreground"
                                )} />
                                <p className="font-medium text-sm">Sequential</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Complete lessons in order to unlock the next
                                </p>
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => updateField('unlock_type', 'scheduled')}
                                className={cn(
                                    "p-4 rounded-xl border-2 transition-all text-left",
                                    formData.unlock_type === 'scheduled'
                                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                        : "border-muted hover:border-primary/50"
                                )}
                                data-testid="unlock-scheduled"
                            >
                                <Calendar className={cn(
                                    "w-6 h-6 mb-2",
                                    formData.unlock_type === 'scheduled' ? "text-primary" : "text-muted-foreground"
                                )} />
                                <p className="font-medium text-sm">Scheduled</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Lessons unlock on their scheduled date
                                </p>
                            </button>
                        </div>
                    </div>
                    
                    {/* Published Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                        <div className="flex items-center gap-3">
                            {formData.is_published ? (
                                <Eye className="w-5 h-5 text-green-600" />
                            ) : (
                                <EyeOff className="w-5 h-5 text-muted-foreground" />
                            )}
                            <div>
                                <p className="font-medium">
                                    {formData.is_published ? 'Published' : 'Draft'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formData.is_published 
                                        ? 'Visible to enrolled members' 
                                        : 'Only visible to teachers'}
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={formData.is_published}
                            onCheckedChange={(checked) => updateField('is_published', checked)}
                            data-testid="publish-toggle"
                        />
                    </div>
                </CardContent>
                
                <div className="p-4 border-t flex items-center justify-end gap-2 flex-shrink-0">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary"
                        data-testid="save-course-btn"
                    >
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default CourseEditor;
