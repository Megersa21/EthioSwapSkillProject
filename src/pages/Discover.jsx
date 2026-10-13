import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/Discover.css';

const skillPartners = [
  {
    id: 1,
    name: 'Hana Bekele',
    initials: 'HB',
    location: 'Addis Ababa',
    teaches: ['UI/UX Design', 'Figma'],
    wants: ['React', 'JavaScript'],
    level: 'Intermediate',
    availability: 'Weekends',
    rating: 4.9,
    swaps: 12,
    match: 92,
    color: 'lavender',
  },
  {
    id: 2,
    name: 'Dawit Alemu',
    initials: 'DA',
    location: 'Dire Dawa',
    teaches: ['JavaScript', 'React'],
    wants: ['UI/UX Design', 'Figma'],
    level: 'Advanced',
    availability: 'Evenings',
    rating: 4.8,
    swaps: 9,
    match: 88,
    color: 'mint',
  },
  {
    id: 3,
    name: 'Sara Mohammed',
    initials: 'SM',
    location: 'Hawassa',
    teaches: ['English', 'Public Speaking'],
    wants: ['Web Development', 'Python'],
    level: 'Intermediate',
    availability: 'Weekends',
    rating: 4.7,
    swaps: 7,
    match: 85,
    color: 'peach',
  },
  {
    id: 4,
    name: 'Yonas Tadesse',
    initials: 'YT',
    location: 'Addis Ababa',
    teaches: ['Python', 'Web Development'],
    wants: ['English', 'Public Speaking'],
    level: 'Beginner',
    availability: 'Evenings',
    rating: 4.8,
    swaps: 6,
    match: 81,
    color: 'blue',
  },
];

const popularSkills = [
  'All skills',
  'Web Development',
  'UI/UX Design',
  'JavaScript',
  'English',
  'Python',
  'Graphic Design',
];

export default function Discover() {
  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('All skills');
  const [level, setLevel] = useState('All levels');
  const [availability, setAvailability] = useState('Any time');
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState('Best match');

  const filteredPartners = useMemo(() => {
    let results = skillPartners.filter((person) => {
      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        person.name.toLowerCase().includes(query) ||
        person.location.toLowerCase().includes(query) ||
        [...person.teaches, ...person.wants].some((skill) =>
          skill.toLowerCase().includes(query),
        );

      const matchesSkill =
        selectedSkill === 'All skills' ||
        person.teaches.includes(selectedSkill) ||
        person.wants.includes(selectedSkill);

      const matchesLevel = level === 'All levels' || person.level === level;

      const matchesAvailability =
        availability === 'Any time' || person.availability === availability;

      const matchesLocation =
        !location.trim() ||
        person.location.toLowerCase().includes(location.trim().toLowerCase());

      return (
        matchesSearch &&
        matchesSkill &&
        matchesLevel &&
        matchesAvailability &&
        matchesLocation
      );
    });

    if (sort === 'Highest rated') {
      results = [...results].sort((a, b) => b.rating - a.rating);
    } else if (sort === 'Most swaps') {
      results = [...results].sort((a, b) => b.swaps - a.swaps);
    } else {
      results = [...results].sort((a, b) => b.match - a.match);
    }

    return results;
  }, [search, selectedSkill, level, availability, location, sort]);

  function clearFilters() {
    setSearch('');
    setSelectedSkill('All skills');
    setLevel('All levels');
    setAvailability('Any time');
    setLocation('');
    setSort('Best match');
  }

  return (
    <>
      <main className="discover-page">
        <section className="discover-heading">
          <span className="discover-eyebrow">YOUR NEXT SKILL STARTS HERE</span>
          <h1>Discover your next skill partner</h1>
          <p>
            Connect with people who can teach you something new. Share what you
            know and learn together.
          </p>

          <div className="discover-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              aria-label="Search skills or people"
              placeholder="Search skills, people, or locations..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="button" onClick={() => {}}>
              Search
            </button>
          </div>
        </section>

        <section className="discover-content">
          <div className="popular-skills">
            <h2>Popular skills</h2>
            <div className="skill-chips">
              {popularSkills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  className={
                    selectedSkill === skill ? 'skill-chip active' : 'skill-chip'
                  }
                  onClick={() => setSelectedSkill(skill)}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <div className="discover-layout">
            <aside className="discover-filters">
              <div className="filter-heading">
                <h2>Filters</h2>
                <button type="button" onClick={clearFilters}>
                  Clear all
                </button>
              </div>

              <label htmlFor="filter-level">Skill level</label>
              <select
                id="filter-level"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
              >
                <option>All levels</option>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>

              <label htmlFor="filter-availability">Availability</label>
              <select
                id="filter-availability"
                value={availability}
                onChange={(event) => setAvailability(event.target.value)}
              >
                <option>Any time</option>
                <option>Weekends</option>
                <option>Evenings</option>
              </select>

              <label htmlFor="filter-location">Location</label>
              <input
                id="filter-location"
                type="text"
                placeholder="Enter a city"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />

              <div className="filter-note">
                <span aria-hidden="true">⇄</span>
                <strong>Skills are better shared.</strong>
                <p>
                  Find someone to learn from and share your knowledge in return.
                </p>
              </div>
            </aside>

            <div className="discover-results">
              <div className="results-toolbar">
                <div>
                  <h2>Skill partners</h2>
                  <p>
                    {filteredPartners.length}{' '}
                    {filteredPartners.length === 1 ? 'partner' : 'partners'}{' '}
                    found
                  </p>
                </div>

                <label className="sort-control">
                  <span>Sort by</span>
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                    aria-label="Sort partners"
                  >
                    <option>Best match</option>
                    <option>Highest rated</option>
                    <option>Most swaps</option>
                  </select>
                </label>
              </div>

              {filteredPartners.length > 0 ? (
                <div className="partner-grid">
                  {filteredPartners.map((person) => (
                    <article className="partner-card" key={person.id}>
                      <div className="partner-card-top">
                        <div className={`partner-avatar ${person.color}`}>
                          {person.initials}
                        </div>

                        <div className="partner-match">
                          <strong>{person.match}%</strong>
                          <span>match</span>
                        </div>
                      </div>

                      <h3>{person.name}</h3>
                      <p className="partner-location">
                        <span aria-hidden="true">⌖</span> {person.location}
                      </p>

                      <div className="partner-stats">
                        <span>★ {person.rating}</span>
                        <span>{person.swaps} successful swaps</span>
                      </div>

                      <div className="partner-skills">
                        <h4>Can teach you</h4>
                        <div className="partner-tags">
                          {person.teaches.map((skill) => (
                            <span className="teach-tag" key={skill}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="partner-skills">
                        <h4>Wants to learn</h4>
                        <div className="partner-tags">
                          {person.wants.map((skill) => (
                            <span className="want-tag" key={skill}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="partner-card-footer">
                        <span>{person.level}</span>
                        <span>{person.availability}</span>
                      </div>

                      <Link
                        className="partner-profile-link"
                        to={`/profile/${person.id}`}
                      >
                        View profile <span aria-hidden="true">→</span>
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="discover-empty">
                  <span aria-hidden="true">⌕</span>
                  <h3>No skill partners found</h3>
                  <p>Try another search or clear some filters.</p>
                  <button type="button" onClick={clearFilters}>
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
