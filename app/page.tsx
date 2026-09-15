import { ArrowDown, ArrowUpRight, ArrowUp, Code2 as Github, MoveUpRight } from 'lucide-react';
import Motion from './motion';

const github = 'https://github.com/andliu7';
const projects = [
  { number: '03', title: 'Mechanism Trainer', repo: 'mechanism_trainer', category: 'Interactive chemistry', description: 'Draw the molecule. Push the electrons. Understand the reaction. A visual practice space with a connected reaction map and structure-aware answer checking.', tags: ['React', 'TypeScript', 'Ketcher'] },
  { number: '04', title: 'Dashboard', repo: 'dashboard', category: 'Personal systems', description: 'A home for notes, workouts, food, goals, and tasks. Exploring how natural-language capture can turn everyday thoughts into useful structure.', tags: ['React', 'Supabase', 'PWA'] },
  { number: '05', title: 'Blueberry Mechanisms', repo: 'blueberry_game', category: 'Learning through play', description: 'The original home of Blueberry’s game experience: chemistry rules, learning pathways, and immediate feedback. The game now lives inside Blueberry.', tags: ['TypeScript', 'Chemistry engine', 'Design systems'] },
  { number: '06', title: 'Focus Family Guide', repo: 'ff_technical_instructions', category: 'Design for community', description: 'A practical publishing guide for the next Focus Family leaders. Turning a process passed down informally into something clear, accessible, and easy to use.', tags: ['Technical writing', 'HTML / CSS', 'Print design'] },
];

function Network() {
  const nodes = [
    { x: 310, y: 220, name: 'A thought', primary: true },
    { x: 154, y: 112, name: 'Notes' }, { x: 473, y: 98, name: 'Projects' },
    { x: 493, y: 300, name: 'Connections' }, { x: 181, y: 340, name: 'Memory' },
    { x: 86, y: 224, name: '' }, { x: 350, y: 57, name: '' },
    { x: 571, y: 187, name: '' }, { x: 368, y: 375, name: '' },
  ];
  return <svg className="network-diagram" viewBox="0 0 640 430" role="img" aria-label="A thought connected to notes, projects, memory, and other ideas">
    <defs><radialGradient id="node-glow"><stop stopColor="#c9b5ff" stopOpacity=".24"/><stop offset="1" stopColor="#c9b5ff" stopOpacity="0"/></radialGradient></defs>
    <circle cx="310" cy="220" r="170" fill="url(#node-glow)"/>
    <g className="network-lines">{nodes.slice(1).map(n => <line key={n.x} x1="310" y1="220" x2={n.x} y2={n.y}/>)}<path d="M154 112L350 57L473 98L571 187L493 300L368 375L181 340L86 224Z"/><path d="M154 112L181 340M473 98L493 300M181 340L493 300"/></g>
    {nodes.map(n => <g key={n.x}><circle cx={n.x} cy={n.y} r={n.primary ? 12 : n.name ? 6 : 3} className={n.primary ? 'central-node' : 'small-node'}/>{n.name && <text x={n.x} y={n.y + (n.primary ? 38 : 28)} textAnchor="middle" className={n.primary ? 'central-label' : ''}>{n.name}</text>}</g>)}
  </svg>;
}

export default function Home() {
  return <>
    <Motion />
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <a className="identity" href="#top" aria-label="Andrew Liu, back to top"><span className="monogram">al<span>·</span></span><span>Andrew Liu</span></a>
      <nav aria-label="Main navigation"><a href="#work">Work <span>06</span></a><a href="#about">About</a><a className="nav-resume" href="/andrew-liu-resume.pdf" target="_blank" rel="noreferrer">Résumé <ArrowUpRight size={15}/></a></nav>
    </header>
    <main id="main">
      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="hero-grid" aria-hidden="true" data-parallax="0.1"/>
        <div className="hero-intro"><span className="eyebrow"><span className="status-dot"/> ANDREW LIU / SELECTED WORK</span><span className="hero-index">SCIENCE / SYSTEMS / SOFTWARE</span></div>
        <div className="hero-content">
          <div className="hero-copy">
            <h1 id="hero-title">Curiosity,<br/><em>put to work.</em></h1>
            <p>I’m Andrew, a computer science student at UMD and co-founder of Blueberry. I build tools that make complex ideas easier to learn, connect, and use.</p>
            <a className="pill-link" href="#work">Explore my work <ArrowDown size={18}/></a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="landscape-frame"><img className="landscape" src="/images/landscape.webp" alt="" width="2048" height="1220" fetchPriority="high" data-parallax="0.18"/><div className="landscape-shade"/><span className="image-cross top-cross">+</span><span className="image-cross bottom-cross">+</span><span className="landscape-label">A DIFFERENT PERSPECTIVE.</span></div>
            <div className="floating-note note-top" data-parallax="-0.12"><span className="note-dot"/> Connect the dots.<span className="note-line"/></div>
            <div className="floating-note note-bottom" data-parallax="0.09"><span className="note-number">01—06</span><span>Ideas made tangible.</span><MoveUpRight size={25}/></div>
            <span className="vertical-caption">AL / SELECTED EXPLORATIONS</span>
          </div>
        </div>
        <div className="hero-bottom"><span>Thoughtful interfaces. Useful ideas.</span><a href="#work" className="scroll-cue">SCROLL TO EXPLORE <ArrowDown size={15}/></a><span className="edition">PORTFOLIO / 2026</span></div>
      </section>
      <section className="work-section section-shell" id="work" aria-labelledby="work-title">
        <div className="section-heading"><div><span className="eyebrow">01 / SELECTED WORK</span><h2 id="work-title">Built out of<br/><em>genuine curiosity.</em></h2></div><p>From understanding a reaction to remembering an idea. Six projects, connected by a desire to make things clearer.</p></div>
        <article className="featured-project blueberry-project">
          <div className="project-visual blueberry-visual"><span className="visual-label">BLUEBERRY / LEARNING IN MOTION</span><div className="browser-frame" data-parallax="-0.035"><div className="browser-bar"><span/><span/><span/><span className="browser-address">blueberry / your learning path</span></div><img src="/images/blueberry.jpg" alt="Blueberry's organic chemistry learning path, with connected lesson nodes and a study sidebar" width="1512" height="786" loading="lazy"/></div><div className="visual-foot"><span>Understand it. Practice it. Make it stick.</span><span>01</span></div></div>
          <div className="project-info"><div className="project-title"><span className="project-category">01 / CO-FOUNDER & PRODUCT LEAD</span><h3>Blueberry</h3></div><div className="project-description"><p>What began as flashcards for classmates is becoming an organic chemistry learning platform. I lead product direction and learning design for a five-person team, connecting study decks, visual pathways, and mechanism practice.</p><div className="project-meta"><div className="tags"><span>React</span><span>TypeScript</span><span>Learning design</span></div><div className="project-links"><a href="https://andliu7.github.io/blueberry/" target="_blank" rel="noreferrer">Visit site <ArrowUpRight size={17}/></a><a href={`${github}/blueberry`} target="_blank" rel="noreferrer" aria-label="View Blueberry source on GitHub"><Github size={20}/></a></div></div></div></div>
        </article>
        <article className="featured-project brain-project">
          <div className="project-visual brain-visual"><div className="brain-topline"><span className="visual-label">SECOND BRAIN / CONNECTED KNOWLEDGE</span><span className="tiny-orbit"/></div><div className="brain-visual-grid" aria-hidden="true"/><div className="network-wrap" data-parallax="-0.045"><Network/></div><div className="brain-caption"><span>Good ideas deserve<br/><em>a second connection.</em></span><span className="diagram-label">FILES → CONTEXT → RECALL</span></div></div>
          <div className="project-info"><div className="project-title"><span className="project-category">02 / KNOWLEDGE SYSTEMS</span><h3>Second Brain</h3></div><div className="project-description"><p>A local home for knowledge. File retrieval, memory, and a web workspace bring scattered information together, with relevant evidence gathered before an AI response.</p><div className="project-meta"><div className="tags"><span>Python</span><span>React</span><span>AI retrieval</span></div><a className="text-link" href={`${github}/second-brain`} target="_blank" rel="noreferrer">Explore project <ArrowUpRight size={17}/></a></div></div></div>
        </article>
        <div className="project-index-header"><span className="eyebrow">MORE EXPLORATIONS</span><span className="small-caption">Different questions. The same curiosity.</span></div>
        <div className="project-list">{projects.map(project => <a className="project-row" key={project.repo} href={`${github}/${project.repo}`} target="_blank" rel="noreferrer"><span className="row-number">{project.number}</span><div className="row-title"><span className="project-category">{project.category}</span><h3>{project.title}</h3></div><div className="row-description"><p>{project.description}</p><div className="row-tags">{project.tags.map(tag => <span key={tag}>{tag}</span>)}</div></div><span className="row-arrow"><ArrowUpRight size={25}/></span></a>)}</div>
      </section>
      <section className="about-section" id="about" aria-labelledby="about-title">
        <div className="about-word" aria-hidden="true" data-drift="0.16">Always learning.</div>
        <div className="about-content section-shell"><div className="about-label"><span className="eyebrow">02 / THE COMMON THREAD</span><span className="about-mark" aria-hidden="true">al<span>·</span></span><div className="education-note"><strong>University of Maryland</strong><span>B.S. Computer Science · Pre-Dental</span><span>Expected May 2027</span></div></div><div className="about-copy"><h2 id="about-title">It starts with<br/><em>“what if?”</em></h2><p className="about-lead">I’m drawn to the space between understanding something and making it useful.</p><p>I study computer science at the University of Maryland, alongside the pre-dental track. That combination keeps bringing me back to the same question: how can technology make a difficult idea easier to understand?</p><p>It’s why I’m building Blueberry, why I enjoy teaching STEM, and why I write guides for my community. The details matter most when they help someone else move forward.</p><div className="about-topics"><span>Visual learning</span><span>Connected thinking</span><span>Human details</span></div></div></div>
      </section>
      <section className="experience-section section-shell" aria-labelledby="experience-title"><div className="experience-heading"><div><span className="eyebrow">03 / ALONG THE WAY</span><h2 id="experience-title">Learning by <em>doing.</em></h2></div><a className="text-link" href="/andrew-liu-resume.pdf" target="_blank" rel="noreferrer">Full résumé <ArrowUpRight size={17}/></a></div><div className="experience-list"><article><span className="experience-date">AUG 2026 — PRESENT</span><div><h3>Co-Founder & Product Lead <span>Blueberry</span></h3><p>Leading product direction and learning-science design for a five-person team building organic chemistry learning tools.</p></div></article><article><span className="experience-date">JUN — AUG 2025</span><div><h3>AI Intern <span>Minnodi LLC</span></h3><p>Built documentation and onboarding infrastructure for Browser Use, working with a distributed team and checking AI-assisted fixes against live agent runs.</p></div></article><article><span className="experience-date">JUN 2025 — JAN 2026</span><div><h3>STEM Tutor <span>Education One</span></h3><p>Taught mathematics and sciences, developed structured practice regimens, and automated grading and administrative workflows.</p></div></article><article><span className="experience-date">JAN 2025 — PRESENT</span><div><h3>Focus Family Leader <span>Kharis Campus Ministry</span></h3><p>Mentoring students, coordinating leaders, and building the guides and automations that make community work easier to carry forward.</p></div></article></div></section>
      <footer className="site-footer section-shell"><div className="footer-top"><div><span className="eyebrow">THERE’S ALWAYS ANOTHER IDEA.</span><h2>Let’s compare <em>notes.</em></h2><a className="email-link" href="mailto:zeus.andrewliu@gmail.com">zeus.andrewliu@gmail.com</a></div><a href="mailto:zeus.andrewliu@gmail.com" className="footer-cta" aria-label="Email Andrew Liu"><ArrowUpRight size={36}/></a></div><div className="footer-bottom"><span>© 2026 Andrew Liu</span><a href={github} target="_blank" rel="noreferrer"><Github size={16}/> andliu7 <ArrowUpRight size={14}/></a><a href="#top">Back to top <ArrowUp size={15}/></a></div></footer>
    </main>
  </>;
}
