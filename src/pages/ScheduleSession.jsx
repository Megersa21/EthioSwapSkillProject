import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ScheduleSession.css';

const dates = [
  { day: 'Sat', date: '17', month: 'Oct', year: '2026' },
  { day: 'Sun', date: '18', month: 'Oct', year: '2026' },
  { day: 'Mon', date: '19', month: 'Oct', year: '2026' },
  { day: 'Tue', date: '20', month: 'Oct', year: '2026' },
  { day: 'Wed', date: '21', month: 'Oct', year: '2026' },
];

const times = ['9:00 AM', '10:00 AM', '2:00 PM', '4:00 PM', '6:00 PM'];

function ScheduleSession() {
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState('4:00 PM');
  const [duration, setDuration] = useState(60);
  const [turnOneMinutes, setTurnOneMinutes] = useState(25);
  const [turnTwoMinutes, setTurnTwoMinutes] = useState(25);
  const [turnOneSkill, setTurnOneSkill] = useState('Graphic design');
  const [turnTwoSkill, setTurnTwoSkill] = useState('Web development');
  const [turnOneTeacher, setTurnOneTeacher] = useState('You');
  const [note, setNote] = useState('');
  const [reminder, setReminder] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const remainingMinutes = Math.max(
    0,
    duration - Number(turnOneMinutes) - Number(turnTwoMinutes),
  );

  const formattedDate = useMemo(() => {
    const date = dates[selectedDate];
    return `${date.day} ${date.date} ${date.month} · ${selectedTime} to ${getEndTime(selectedTime)}`;
  }, [selectedDate, selectedTime]);

  function getEndTime(startTime) {
    const match = startTime.match(/^(\d+):(\d+)\s(AM|PM)$/);

    if (!match) return startTime;

    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const period = match[3];

    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;

    const start = new Date(2026, 9, 17, hour, minute);
    start.setMinutes(start.getMinutes() + Number(duration));

    return start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function sendInvite(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (Number(turnOneMinutes) < 1 || Number(turnTwoMinutes) < 1) {
      setError('Each teaching turn must be at least one minute.');
      return;
    }

    if (Number(turnOneMinutes) + Number(turnTwoMinutes) > Number(duration)) {
      setError('The teaching turns cannot exceed the total session length.');
      return;
    }

    const invitation = {
      id: Date.now(),
      partner: 'Dawit Alemu',
      initials: 'DA',
      teachSkill: turnOneSkill,
      learnSkill: turnTwoSkill,
      date: `${dates[selectedDate].day} ${dates[selectedDate].date} ${dates[selectedDate].month} ${dates[selectedDate].year}`,
      time: formattedDate.split(' · ')[1],
      duration: Number(duration),
      turnOneMinutes: Number(turnOneMinutes),
      turnTwoMinutes: Number(turnTwoMinutes),
      turnOneTeacher,
      note,
      reminder,
      status: 'Waiting for reply',
      category: 'upcoming',
      invite: true,
    };

    try {
      const storageKey = 'swapSkillSessions';
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      localStorage.setItem(
        storageKey,
        JSON.stringify([...existing, invitation]),
      );
      setSuccess('Your invitation has been saved in this browser.');
    } catch {
      setError(
        'Could not save the invitation. Please check your browser storage.',
      );
    }
  }

  return (
    <main className="schedule-page">
      <header className="schedule-navbar">
        <a className="schedule-brand" href="/">
          <span className="schedule-brand-icon">⇄</span>
          <span>SwapSkill</span>
        </a>

        <nav className="schedule-nav-links" aria-label="Main navigation">
          <a href="/">Home</a>
          <a href="/discover">Skills</a>
          <a href="/requests">Requests</a>
          <a href="/sessions" className="active">
            Sessions
          </a>
          <a href="/messages">Messages</a>
        </nav>

        <a className="schedule-user" href="/edit-profile">
          <span className="schedule-user-avatar">SU</span>
          <span>Sample User</span>
        </a>
      </header>

      <div className="schedule-container">
        <a className="schedule-back-link" href="/sessions">
          ← Sessions
        </a>

        <h1 className="schedule-page-title">Schedule a video session</h1>

        <form className="schedule-layout" onSubmit={sendInvite}>
          <div className="schedule-main-column">
            <section className="schedule-partner-card">
              <div className="schedule-partner-avatar">DA</div>

              <div className="schedule-partner-info">
                <h2>Dawit A.</h2>
                <p>Accepted swap: Graphic design ⇄ Web development</p>
              </div>

              <span className="schedule-accepted">Accepted</span>
            </section>

            <section className="schedule-panel">
              <h2>1. Pick a date and time</h2>

              <div className="schedule-choice-row">
                {dates.map((date, index) => (
                  <button
                    type="button"
                    key={date.date}
                    className={`schedule-choice ${
                      selectedDate === index ? 'selected' : ''
                    }`}
                    onClick={() => setSelectedDate(index)}
                  >
                    {date.day} {date.date} {date.month}
                  </button>
                ))}
              </div>

              <div className="schedule-choice-row schedule-time-row">
                {times.map((time) => (
                  <button
                    type="button"
                    key={time}
                    className={`schedule-choice ${
                      selectedTime === time ? 'selected' : ''
                    }`}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </button>
                ))}
              </div>

              <p className="schedule-helper">
                Times are shown in East Africa Time (UTC+3). Dawit will see them
                in his own time zone.
              </p>
            </section>

            <section className="schedule-panel">
              <h2>2. Plan the turns</h2>

              <label className="schedule-duration-label" htmlFor="duration">
                Total length
              </label>

              <select
                id="duration"
                className="schedule-duration-select"
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
                <option value={120}>120 minutes</option>
              </select>

              <div className="schedule-turn-card turn-one">
                <p className="schedule-turn-label">TURN 1</p>

                <div className="schedule-turn-fields">
                  <label>
                    Who teaches
                    <select
                      value={turnOneTeacher}
                      onChange={(event) => {
                        setTurnOneTeacher(event.target.value);
                        setTurnOneSkill(
                          event.target.value === 'You'
                            ? 'Graphic design'
                            : 'Web development',
                        );
                        setTurnTwoSkill(
                          event.target.value === 'You'
                            ? 'Web development'
                            : 'Graphic design',
                        );
                      }}
                    >
                      <option value="You">You</option>
                      <option value="Dawit A.">Dawit A.</option>
                    </select>
                  </label>

                  <label>
                    Skill
                    <select
                      value={turnOneSkill}
                      onChange={(event) => setTurnOneSkill(event.target.value)}
                    >
                      <option>Graphic design</option>
                      <option>Web development</option>
                      <option>JavaScript</option>
                      <option>React</option>
                      <option>UI/UX Design</option>
                      <option>Flutter</option>
                    </select>
                  </label>

                  <label>
                    Minutes
                    <input
                      type="number"
                      min="1"
                      max={duration}
                      value={turnOneMinutes}
                      onChange={(event) =>
                        setTurnOneMinutes(event.target.value)
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="schedule-turn-card turn-two">
                <p className="schedule-turn-label">TURN 2</p>

                <div className="schedule-turn-fields">
                  <label>
                    Who teaches
                    <select
                      value={turnOneTeacher === 'You' ? 'Dawit A.' : 'You'}
                      onChange={(event) =>
                        setTurnOneTeacher(
                          event.target.value === 'You' ? 'Dawit A.' : 'You',
                        )
                      }
                    >
                      <option value="Dawit A.">Dawit A.</option>
                      <option value="You">You</option>
                    </select>
                  </label>

                  <label>
                    Skill
                    <select
                      value={turnTwoSkill}
                      onChange={(event) => setTurnTwoSkill(event.target.value)}
                    >
                      <option>Web development</option>
                      <option>Graphic design</option>
                      <option>JavaScript</option>
                      <option>React</option>
                      <option>UI/UX Design</option>
                      <option>Flutter</option>
                    </select>
                  </label>

                  <label>
                    Minutes
                    <input
                      type="number"
                      min="1"
                      max={duration}
                      value={turnTwoMinutes}
                      onChange={(event) =>
                        setTurnTwoMinutes(event.target.value)
                      }
                    />
                  </label>
                </div>
              </div>

              <p className="schedule-helper">
                {remainingMinutes > 0
                  ? `The remaining ${remainingMinutes} minutes are kept for feedback and next steps.`
                  : 'Your teaching turns use the full session time.'}
              </p>
            </section>

            <section className="schedule-panel">
              <h2>3. Add a note</h2>

              <label className="schedule-note-label" htmlFor="session-note">
                Message to Dawit (optional)
              </label>

              <textarea
                id="session-note"
                rows="3"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="What would you like to cover? Anything to prepare?"
              />

              <label className="schedule-reminder">
                <input
                  type="checkbox"
                  checked={reminder}
                  onChange={(event) => setReminder(event.target.checked)}
                />
                Remind both of us 15 minutes before the session.
              </label>
            </section>
          </div>

          <aside className="schedule-summary-card">
            <h2>Session summary</h2>

            <p className="schedule-summary-label">When</p>
            <strong>{formattedDate}</strong>

            <p className="schedule-summary-label">Where</p>
            <strong>SwapSkill video room</strong>
            <p className="schedule-summary-muted">
              Opens in your browser. No download needed.
            </p>

            <p className="schedule-summary-label">Plan</p>

            <div className="schedule-summary-turn summary-turn-one">
              <span>
                {turnOneTeacher === 'You' ? 'You' : 'Dawit'} · {turnOneSkill}
              </span>
              <strong>{turnOneMinutes} min</strong>
            </div>

            <div className="schedule-summary-turn summary-turn-two">
              <span>
                {turnOneTeacher === 'You' ? 'Dawit' : 'You'} · {turnTwoSkill}
              </span>
              <strong>{turnTwoMinutes} min</strong>
            </div>

            <div className="schedule-summary-turn summary-wrap">
              <span>Wrap-up</span>
              <strong>{remainingMinutes} min</strong>
            </div>

            {error && <p className="schedule-error">{error}</p>}
            {success && <p className="schedule-success">{success}</p>}

            <button className="schedule-send-button" type="submit">
              Send invite
            </button>

            <button
              className="schedule-cancel-button"
              type="button"
              onClick={() => navigate('/sessions')}
            >
              Cancel
            </button>

            <p className="schedule-summary-footer">
              Dawit gets a notification and can accept or suggest another time.
            </p>
          </aside>
        </form>
      </div>
    </main>
  );
}

export default ScheduleSession;
