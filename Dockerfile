FROM cyrale/curvytron

ENV APP_DIRECTORY /curvytron

WORKDIR ${APP_DIRECTORY}

COPY web/images/bonus.png web/images/bonus.png
COPY src src

RUN gulp

EXPOSE 8080

CMD node bin/curvytron.js