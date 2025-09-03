import React from 'react';
import { Link, Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div>
      <header>
        <Link to="/" className="logo animated">
          <img src="/images/logo.svg" alt="Curvytron" id="logo" />
          <span className="brand">curvytron</span>
        </Link>
        <nav>
            <Link to="/rooms">Räume</Link>
            <Link to="/profile">Profil</Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer>
        <div className="container">
          <div className="row">
            <div className="col-lg-6 col-md-6 col-sm-6 col-xs-6 no-padding-bottom">
              <a href="https://github.com/Elao/curvytron" target="_blank" className="ml10 animated"><i className="icon-github"></i></a>
              <a href="http://twitter.com/curvytron" target="_blank" className="ml10 animated"><i className="icon-twitter"></i></a>
              <a href="http://www.reddit.com/r/curvytron" target="_blank" className="ml10 animated"><i className="icon-reddit"></i></a>
              {/* <a href="/#/about" className="ml15 animated">About Us</a> */}
            </div>
            <div className="col-lg-6 col-md-6 col-sm-6 col-xs-6 no-padding-bottom text-right">
              <a href="http://www.elao.com" className="game-copy animated" target="_blank">
                Handmade at Elao with <i className="icon-love"></i>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
