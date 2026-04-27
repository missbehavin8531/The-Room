import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAPI } from '../lib/api';
import {
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from './ui/command';
import { BookOpen, FileText, MessageCircle } from 'lucide-react';

export function SearchCommand({ open, onOpenChange }) {
    var [query, setQuery] = useState('');
    var [results, setResults] = useState(null);
    var [loading, setLoading] = useState(false);
    var navigate = useNavigate();
    var debounceRef = React.useRef(null);

    // Debounced search
    var doSearch = useCallback(function(q) {
        if (!q || q.length < 2) {
            setResults(null);
            return;
        }
        setLoading(true);
        searchAPI.search(q)
            .then(function(res) {
                setResults(res.data);
                setLoading(false);
            })
            .catch(function() {
                setLoading(false);
            });
    }, []);

    useEffect(function() {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(function() {
            doSearch(query);
        }, 300);
        return function() { clearTimeout(debounceRef.current); };
    }, [query, doSearch]);

    // Reset on close
    useEffect(function() {
        if (!open) {
            setQuery('');
            setResults(null);
        }
    }, [open]);

    function handleSelect(type, id) {
        onOpenChange(false);
        if (type === 'course') navigate('/courses/' + id);
        else if (type === 'lesson') navigate('/lessons/' + id);
        else if (type === 'discussion') navigate('/lessons/' + id);
    }

    var courses = results?.courses || [];
    var lessons = results?.lessons || [];
    var discussions = results?.discussions || [];
    var hasResults = courses.length > 0 || lessons.length > 0 || discussions.length > 0;

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
            <CommandInput
                placeholder="Search courses, lessons, discussions..."
                value={query}
                onValueChange={setQuery}
                data-testid="search-cmd-k-input"
            />
            <CommandList>
                {loading && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                        Searching...
                    </div>
                )}
                {!loading && query.length >= 2 && !hasResults && (
                    <CommandEmpty>No results found.</CommandEmpty>
                )}
                {!loading && query.length < 2 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                        Type at least 2 characters to search
                    </div>
                )}
                {courses.length > 0 && (
                    <CommandGroup heading="Courses">
                        {courses.map(function(c) {
                            return (
                                <CommandItem
                                    key={c.id}
                                    value={c.title}
                                    onSelect={function() { handleSelect('course', c.id); }}
                                    className="cursor-pointer"
                                    data-testid={"search-result-course-" + c.id}
                                >
                                    <BookOpen className="w-4 h-4 mr-2 text-blue-600 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{c.title}</p>
                                        {c.description && <p className="text-xs text-muted-foreground truncate">{c.description}</p>}
                                    </div>
                                </CommandItem>
                            );
                        })}
                    </CommandGroup>
                )}
                {lessons.length > 0 && (
                    <CommandGroup heading="Lessons">
                        {lessons.map(function(l) {
                            return (
                                <CommandItem
                                    key={l.id}
                                    value={l.title}
                                    onSelect={function() { handleSelect('lesson', l.id); }}
                                    className="cursor-pointer"
                                    data-testid={"search-result-lesson-" + l.id}
                                >
                                    <FileText className="w-4 h-4 mr-2 text-green-600 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{l.title}</p>
                                        {l.description && <p className="text-xs text-muted-foreground truncate">{l.description}</p>}
                                    </div>
                                </CommandItem>
                            );
                        })}
                    </CommandGroup>
                )}
                {discussions.length > 0 && (
                    <CommandGroup heading="Discussions">
                        {discussions.map(function(d, idx) {
                            return (
                                <CommandItem
                                    key={'disc-' + idx}
                                    value={d.content}
                                    onSelect={function() { handleSelect('discussion', d.lesson_id); }}
                                    className="cursor-pointer"
                                >
                                    <MessageCircle className="w-4 h-4 mr-2 text-purple-600 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm truncate">{d.content}</p>
                                        <p className="text-xs text-muted-foreground">by {d.user_name}</p>
                                    </div>
                                </CommandItem>
                            );
                        })}
                    </CommandGroup>
                )}
            </CommandList>
        </CommandDialog>
    );
}
