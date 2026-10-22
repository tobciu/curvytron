<template>
<section id="about" class="container">
    <section>
        <h1>This version</h1>
        <div class="row">
            <div class="col-lg-12">
                <p>
                    This is a fork of Curvytron by Elao, kept up by
                    <a href="https://github.com/tobciu" target="_blank" rel="noopener" class="animated strong">tobciu</a>.
                    The game is still the one you know, but a lot has changed under and on top of it.
                    <a href="https://github.com/tobciu/curvytron" target="_blank" rel="noopener" class="animated">Source code and issues</a>
                </p>
            </div>
        </div>
        <div class="row">
            <div class="col-lg-12 text-left">
                <h3>What is new</h3>
                <ul class="changes">
                    <li>The front end was rewritten with Vue 3, and the whole code base moved to TypeScript.</li>
                    <li>Statistics and awards at the end of a game, explained on the <RouterLink to="/rules/statistics" class="animated">rules page</RouterLink>.</li>
                    <li>A rules page with the controls, all bonuses and the game modes.</li>
                    <li>Reconnecting to a running game, joining a game late, and showing who is away.</li>
                    <li>Bonuses that target the leader, and a registry that makes it easy to add new ones.</li>
                    <li>Monitoring with Prometheus and Grafana, and a health endpoint for the server.</li>
                </ul>
            </div>
        </div>
    </section>
    <section>
        <h1>Original team</h1>
        <div class="row">
            <div class="col-lg-4 col-md-4 col-sm-4">
                <a href="https://twitter.com/tom32i" target="_blank"><img src="https://www.gravatar.com/avatar/20e88ca8f96ba64d6767fb7be675c792?s=120" alt="Thomas JARRAND" class="rounded"></a>
                <h3><a href="https://twitter.com/tom32i" target="_blank" class="animated">Thomas JARRAND</a></h3>
                <p>Co-founder / Developer <br/><a href="https://twitter.com/tom32i" target="_blank" class="strong animated">@tom32i</a></p>
            </div>
            <div class="col-lg-4 col-md-4 col-sm-4">
                <a href="https://twitter.com/JeremyFagis" target="_blank"><img src="https://www.gravatar.com/avatar/7f70e04906c6be43177bfeafe903b649?s=120" alt="Jérémy FAGIS" class="rounded"></a>
                <h3><a href="https://twitter.com/JeremyFagis" target="_blank" class="animated">Jérémy FAGIS</a></h3>
                <p>Frontend Developer <br/><a href="https://twitter.com/JeremyFagis" target="_blank" class="strong animated">@JeremyFagis</a></p>
            </div>
            <div class="col-lg-4 col-md-4 col-sm-4">
                <a href="https://twitter.com/lutangar" target="_blank"><img src="https://www.gravatar.com/avatar/0384071d85ca349ff9669f56239d568c?s=120" alt="Johan DUFOUR" class="rounded"></a>
                <h3><a href="https://twitter.com/lutangar" target="_blank" class="animated">Johan DUFOUR</a></h3>
                <p>Co-founder / Developer <br/><a href="https://twitter.com/lutangar" target="_blank" class="strong animated">@lutangar</a></p>
            </div>
        </div>
    </section>
    <section>
        <h1>Thanks</h1>
        <div class="row">
            <div class="col-lg-2"></div>
            <div class="col-lg-4">
                <h3>Inspired By</h3>
                <p><a href="https://curvefever.com" target="_blank" class="animated">Curve Fever</a></p>
            </div>
            <div class="col-lg-4">
                <h3>Original game made at</h3>
                <p><a href="https://elao.com" target="_blank" class="animated">Elao</a> &bull; <a href="https://twitter.com/elao" target="_blank" class="animated">@elao</a></p>
            </div>
            <div class="col-lg-2"></div>
        </div>
        <div class="row">
            <div class="col-lg-12">
                <section class="pt15 pb15">
                    <h3>Special thanks to:</h3>
                    <p>
                        <strong>Emeric Kasbarian</strong> &bull; Developer / Balancing &bull; <a href="https://twitter.com/emerick42" target="_blank" class="animated">@emerick42</a><br/>
                        <strong>Jérémy James</strong> &bull; Balancing &bull; <a href="https://twitter.com/JamesJrmy" target="_blank" class="animated">@JamesJrmy</a>
                    </p>
                </section>
                <section class="pt15 pb15">
                    <h3>People from <a href="https://elao.com" target="_blank" class="animated">Elao</a> and <a href="https://www.zol.fr" target="_blank" class="animated">Zol</a></h3>
                    <p>Jeremy, Nicolas, Camille, Maxime, Benjamin, Florian, Guewen, Xavier</p>
                </section>
            </div>
        </div>
    </section>
    <section>
        <h1>Technology</h1>
        <div class="row">
            <div class="col-lg-12">
                <p>Vue 3, TypeScript, Vite, SCSS, HTML5 canvas</p>
                <p>Node.js, Express, WebSocket (ws)</p>
            </div>
        </div>
    </section>
</section>
</template>
