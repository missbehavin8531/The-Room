import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { searchAPI } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, BookOpen, FileText, MessageCircle, Loader2 } from 'lucide-react';

function SearchPage() {
    var query = useState('');
    var searchText = query[0];
    var setSearchText = query[1];

    var resultsState = useState(null);
    var results = resultsState[0];
    var setResults = resultsState[1];

    var loadState = useState(false);
    var loading = loadState[0];
    var setLoading = loadState[1];

    var navigate = useNavigate();

    function handleSearch() {
        if (!searchText.trim()) return;
        setLoading(true);
        searchAPI.search(searchText.trim())
            .then(function(res) {
                setResults(res.data);
                setLoading(false);
            })
            .catch(function() {
                setLoading(false);
            });
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    }

    function goToCourse(id) {
        navigate('/courses/' + id);
    }

    function goToLesson(id) {
        navigate('/lessons/' + id);
    }

    var courseResults = [];
    var lessonResults = [];
    var discussionResults = [];

    if (results) {
        courseResults = results.courses || [];
        lessonResults = results.lessons || [];
        discussionResults = results.discussions || [];
    }

    var hasResults = courseResults.length > 0 || lessonResults.length > 0 || discussionResults.length > 0;
    var totalCount = courseResults.length + lessonResults.length + discussionResults.length;

    return (
        <Layout>
            <div className="max-w-3xl mx-auto px-4" data-testid="search-page">
                <h1 className="text-3xl font-serif font-bold mb-6 flex items-center gap-3">
                    <SearchIcon className="w-8 h-8" />
                    Search
                </h1>

                <div className="flex gap-2 mb-6">
                    <Input
                        data-testid="search-input"
                        placeholder="Search courses, lessons, discussions..."
                        value={searchText}
                        onChange={function(e) { setSearchText(e.target.value); }}
                        onKeyDown={handleKeyDown}
                        className="flex-1"
                    />
                    <Button
                        data-testid="search-submit-btn"
                        onClick={handleSearch}
                        disabled={loading || !searchText.trim()}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon className="w-4 h-4" />}
                    </Button>
                </div>

                {loading && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Searching...
                    </div>
                )}

                {results && !loading && !hasResults && (
                    <div className="text-center py-12 text-muted-foreground" data-testid="search-no-results">
                        No results found for "{searchText}"
                    </div>
                )}

                {results && !loading && hasResults && (
                    <div className="space-y-6">
                        <p className="text-sm text-muted-foreground" data-testid="search-results-count">
                            {totalCount} result{totalCount !== 1 ? 's' : ''} found
                        </p>

                        {courseResults.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-blue-600" />
                                    Courses
                                    <Badge variant="secondary">{courseResults.length}</Badge>
                                </h2>
                                <div className="space-y-2">
                                    {courseResults.map(function(course) {
                                        return (
                                            <Card
                                                key={course.id}
                                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                onClick={function() { goToCourse(course.id); }}
                                                data-testid={'search-result-course-' + course.id}
                                            >
                                                <CardContent className="p-4">
                                                    <p className="font-medium">{course.title}</p>
                                                    {course.description && (
                                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                            {course.description}
                                                        </p>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {lessonResults.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-green-600" />
                                    Lessons
                                    <Badge variant="secondary">{lessonResults.length}</Badge>
                                </h2>
                                <div className="space-y-2">
                                    {lessonResults.map(function(lesson) {
                                        return (
                                            <Card
                                                key={lesson.id}
                                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                onClick={function() { goToLesson(lesson.id); }}
                                                data-testid={'search-result-lesson-' + lesson.id}
                                            >
                                                <CardContent className="p-4">
                                                    <p className="font-medium">{lesson.title}</p>
                                                    {lesson.description && (
                                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                            {lesson.description}
                                                        </p>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {discussionResults.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                    <MessageCircle className="w-5 h-5 text-purple-600" />
                                    Discussions
                                    <Badge variant="secondary">{discussionResults.length}</Badge>
                                </h2>
                                <div className="space-y-2">
                                    {discussionResults.map(function(disc, idx) {
                                        return (
                                            <Card
                                                key={'disc-' + idx}
                                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                onClick={function() { goToLesson(disc.lesson_id); }}
                                            >
                                                <CardContent className="p-4">
                                                    <p className="text-sm">{disc.content}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        by {disc.user_name}
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!results && !loading && (
                    <div className="text-center py-16 text-muted-foreground" data-testid="search-empty-state">
                        <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg">Search across courses, lessons, and discussions</p>
                        <p className="text-sm mt-2">Type a keyword and press Enter or click the search button</p>
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default SearchPage;
