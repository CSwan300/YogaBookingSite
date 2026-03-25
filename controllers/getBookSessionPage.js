/* ── Book session page (drop-in) ────────────────────────────── */
export const getBookSessionPage = async (req, res, next) => {
    try {
        const course = await CourseModel.findById(req.params.id);
        if (!course)
            return res.status(404).render("error", {
                title:   "Not found",
                message: "Course not found",
            });

        // Guard: redirect to full-course booking if drop-in isn't allowed
        if (!course.allowDropIn) {
            return res.redirect(`/courses/${req.params.id}/book`);
        }

        const sessions = await SessionModel.listByCourse(course._id);
        const now = new Date();

        // Optional pre-selection via ?sessionId= (e.g. linked from schedule page)
        const preSelectedId = req.query.sessionId || null;

        const rows = sessions
            .filter(s => new Date(s.startDateTime) >= now)
            .map(s => {
                const remaining = Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0));
                return {
                    id:              s._id,
                    start:           fmtDate(s.startDateTime),
                    remaining,
                    isFull:          remaining === 0,
                    pluralRemaining: remaining !== 1,
                    isSelected:      false, // set below
                };
            });

        // Pre-select: honour ?sessionId if valid and available, else first non-full
        const preSelected = preSelectedId
            ? rows.find(s => String(s.id) === String(preSelectedId) && !s.isFull)
            : null;
        const fallback = rows.find(s => !s.isFull);
        const toSelect = preSelected || fallback;
        if (toSelect) toSelect.isSelected = true;

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