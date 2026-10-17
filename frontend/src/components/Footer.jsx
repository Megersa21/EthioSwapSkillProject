export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-width footer-inner">
        <p>EthioSwapSkill · Dire Dawa University project</p>
        <div className="footer-links">
          <a
            href="#community-rules"
            onClick={(event) => {
              event.preventDefault();
              window.alert('Community rules will be added in a future step.');
            }}
          >
            Community rules
          </a>
          <a
            href="#privacy"
            onClick={(event) => {
              event.preventDefault();
              window.alert('The privacy page will be added in a future step.');
            }}
          >
            Privacy
          </a>
          <a href="mailto:hello@swapskill.example">Contact</a>
        </div>
      </div>
    </footer>
  );
}
