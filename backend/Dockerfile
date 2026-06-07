# syntax=docker/dockerfile:1
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY . .
RUN chmod +x ./gradlew && ./gradlew --no-daemon clean bootJar -x test

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/build/libs/*.jar /app/app.jar
ENV JAVA_OPTS=""
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
