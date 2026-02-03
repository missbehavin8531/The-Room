import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const LessonCalendar = ({ lessons = [], onLessonClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get lessons mapped by date
    const lessonsByDate = useMemo(() => {
        const map = {};
        lessons.forEach(lesson => {
            if (lesson.lesson_date) {
                const dateKey = lesson.lesson_date.split('T')[0];
                if (!map[dateKey]) map[dateKey] = [];
                map[dateKey].push(lesson);
            }
        });
        return map;
    }, [lessons]);

    // Calculate calendar grid
    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();
        
        const days = [];
        
        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDay - 1; i >= 0; i--) {
            days.push({
                day: prevMonthLastDay - i,
                isCurrentMonth: false,
                date: new Date(year, month - 1, prevMonthLastDay - i)
            });
        }
        
        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                day: i,
                isCurrentMonth: true,
                date: new Date(year, month, i)
            });
        }
        
        // Next month days
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                day: i,
                isCurrentMonth: false,
                date: new Date(year, month + 1, i)
            });
        }
        
        return days;
    }, [year, month]);

    const goToPrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const isToday = (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const formatDateKey = (date) => {
        return date.toISOString().split('T')[0];
    };

    return (
        <Card className="card-organic">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-primary" />
                        Lesson Schedule
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={goToToday}>
                            Today
                        </Button>
                        <Button variant="ghost" size="sm" onClick={goToPrevMonth}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="font-medium min-w-[140px] text-center">
                            {MONTHS[month]} {year}
                        </span>
                        <Button variant="ghost" size="sm" onClick={goToNextMonth}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {DAYS.map(day => (
                        <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                            {day}
                        </div>
                    ))}
                </div>
                
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((dayObj, index) => {
                        const dateKey = formatDateKey(dayObj.date);
                        const dayLessons = lessonsByDate[dateKey] || [];
                        const hasLessons = dayLessons.length > 0;
                        
                        return (
                            <div
                                key={index}
                                className={cn(
                                    "min-h-[60px] p-1 rounded-lg transition-colors",
                                    dayObj.isCurrentMonth ? "bg-background" : "bg-muted/30",
                                    hasLessons && "cursor-pointer hover:bg-primary/5",
                                    isToday(dayObj.date) && "ring-2 ring-primary ring-offset-2"
                                )}
                                onClick={() => hasLessons && onLessonClick && onLessonClick(dayLessons[0])}
                            >
                                <div className={cn(
                                    "text-sm font-medium mb-1",
                                    !dayObj.isCurrentMonth && "text-muted-foreground/50",
                                    isToday(dayObj.date) && "text-primary"
                                )}>
                                    {dayObj.day}
                                </div>
                                {hasLessons && (
                                    <div className="space-y-1">
                                        {dayLessons.slice(0, 2).map(lesson => (
                                            <div
                                                key={lesson.id}
                                                className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded truncate"
                                                title={lesson.title}
                                            >
                                                {lesson.title}
                                            </div>
                                        ))}
                                        {dayLessons.length > 2 && (
                                            <div className="text-xs text-muted-foreground">
                                                +{dayLessons.length - 2} more
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default LessonCalendar;
