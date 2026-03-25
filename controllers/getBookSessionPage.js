/* ── Book session page (drop-in) ────────────────────────────── */
export const getBookSessionPage = async (req, res, next) => {
    try {
        const course = await CourseModel.findById(req.params.id);
        if (!course)
            return res.status(404).render("error", {
                title:   "Not found",
                message: "Course not found",
            });

        // Hard redirect if drop-in is not enabled for this course
        if (!course.allowDropIn) {
            return res.redirect(`/courses/${req.params.id}/book`);
        }

        const sessions = await SessionModel.listByCourse(course._id);
        const now = new Date();

        const rows = sessions
            .filter(s => new Date(s.startDateTime) >= now)
            .map(s => {
                const remaining = Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0));
                return {
                    id:             s._id,
                    start:          fmtDate(s.startDateTime),
                    remaining,
                    isFull:         remaining === 0,
                    pluralRemaining: remaining !== 1,
                    // Pre-select the first available session
                    isSelected:     false,
                };
            });

        // Mark the first non-full session as pre-selected
        const firstAvailable = rows.find(s => !s.isFull);
        if (firstAvailable) firstAvailable.isSelected = true;

        res.render("course_book_session", {
            title: `Drop-in: ${course.title}`,
            course: {
                id:          course._id,
                title:       course.title,
                level:       course.level,
                type:        fmtType(course.type),
                price:       course.price,
                allowDropIn: course.allowDropIn,
                description: course.description,
            },
            sessions: rows,
            user: {
                id:    req.user._id,
                name:  req.user.name,
                email: req.user.email,
            },
        });
    } catch (err) {
        next(err);
    }
};
