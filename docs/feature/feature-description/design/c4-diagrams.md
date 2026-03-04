# Feature Description - C4 Diagrams

## System Context (Level 1)

Shows the complete system including generation and display workflows.

```mermaid
C4Context
    title System Context - Feature Description Generation and Display

    Person(dev, "Developer", "Creates roadmaps and views feature progress")

    System_Boundary(nwteams, "NW-Teams") {
        System(roadmapgen, "Roadmap Generator", "AI-generates descriptions during roadmap creation")
        System(board, "Board Application", "Displays feature roadmaps, progress, and descriptions")
    }

    System_Ext(filesystem, "Project Filesystem", "Contains feature docs and roadmap.yaml files")
    System_Ext(llm, "LLM API", "Claude API for description generation")
    System_Ext(browser, "Web Browser", "Renders React SPA")

    Rel(dev, roadmapgen, "Runs /nw:roadmap", "CLI")
    Rel(roadmapgen, filesystem, "Reads feature docs", "fs")
    Rel(roadmapgen, llm, "Generates descriptions", "API")
    Rel(roadmapgen, filesystem, "Writes roadmap.yaml", "fs")
    Rel(dev, browser, "Opens board URL")
    Rel(browser, board, "Loads SPA, receives updates", "HTTP/WebSocket")
    Rel(board, filesystem, "Watches and reads roadmap files", "fs/chokidar")
```

## Container Diagram (Level 2)

Shows the internal containers of the board application.

```mermaid
C4Container
    title Container Diagram - Feature Description Data Flow

    Person(dev, "Developer")

    Container_Boundary(board, "NW-Teams Board") {
        Container(spa, "React SPA", "TypeScript, React, Vite", "Renders FeatureCard with shortDescription, FeatureBoardView with description")

        Container(server, "Express Server", "Node.js, Express, TypeScript", "Parses roadmap.yaml, derives FeatureSummary with descriptions")

        Container(watcher, "File Watcher", "chokidar", "Detects roadmap.yaml changes, triggers re-parse")

        ContainerDb(shared, "Shared Types", "TypeScript interfaces", "RoadmapMeta, FeatureSummary with description fields")
    }

    System_Ext(fs, "Filesystem", "roadmap.yaml files")

    Rel(dev, spa, "Views features", "HTTPS")
    Rel(spa, server, "Receives feature data", "WebSocket")
    Rel(spa, shared, "Imports FeatureSummary type")
    Rel(server, shared, "Imports RoadmapMeta, FeatureSummary types")
    Rel(server, fs, "Reads roadmap.yaml", "fs.readFile")
    Rel(watcher, fs, "Monitors changes", "chokidar.watch")
    Rel(watcher, server, "Triggers reload", "event callback")
```

## Component Diagram (Level 3)

Shows internal components within the server container for description handling.

```mermaid
C4Component
    title Component Diagram - Description Processing Pipeline

    Container_Boundary(server, "Express Server") {
        Component(parser, "Parser Module", "parser.ts", "validateRoadmapMeta extracts short_description and description from YAML")

        Component(discovery, "Feature Discovery", "feature-discovery.ts", "deriveFeatureSummary maps descriptions to FeatureSummary")

        Component(api, "HTTP/WS Handlers", "index.ts", "Serves FeatureSummary to clients")
    }

    Container_Boundary(spa, "React SPA") {
        Component(featurecard, "FeatureCard", "FeatureCard.tsx", "Displays shortDescription below feature name")

        Component(boardview, "FeatureBoardView", "FeatureBoardView.tsx", "Displays description above KanbanBoard")
    }

    ContainerDb(types, "Shared Types", "RoadmapMeta, FeatureSummary")
    System_Ext(fs, "roadmap.yaml")

    Rel(parser, fs, "Reads YAML content")
    Rel(parser, types, "Returns RoadmapMeta")
    Rel(discovery, parser, "Calls parseRoadmap")
    Rel(discovery, types, "Returns FeatureSummary")
    Rel(api, discovery, "Calls discoverFeaturesFs")
    Rel(featurecard, types, "Receives FeatureSummary")
    Rel(boardview, types, "Receives FeatureSummary")
```

## Sequence: Description Generation Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Gen as Roadmap Generator
    participant Docs as Feature Docs
    participant LLM as LLM API
    participant YAML as roadmap.yaml

    Dev->>Gen: /nw:roadmap {feature-id}
    Gen->>Docs: Read docs (priority order)
    alt architecture.md exists
        Docs-->>Gen: Overview section content
    else requirements.md exists
        Docs-->>Gen: Feature Overview content
    else discuss/*.md exists
        Docs-->>Gen: Document content
    else no docs
        Gen->>Gen: Build fallback from phase/step names
    end
    Gen->>LLM: Generate descriptions prompt
    LLM-->>Gen: short_description, description
    Gen->>YAML: Write roadmap with descriptions
    Gen-->>Dev: Roadmap created with descriptions
```

## Sequence: Description Display Flow

```mermaid
sequenceDiagram
    participant FS as Filesystem
    participant Parser as parser.ts
    participant Discovery as feature-discovery.ts
    participant Server as Express Server
    participant SPA as React SPA
    participant Card as FeatureCard
    participant Board as FeatureBoardView

    FS->>Parser: roadmap.yaml content
    Parser->>Parser: validateRoadmapMeta()
    Note over Parser: Extract short_description, description
    Parser->>Discovery: RoadmapMeta with descriptions
    Discovery->>Discovery: deriveFeatureSummary()
    Note over Discovery: Map to FeatureSummary fields
    Discovery->>Server: FeatureSummary[]
    Server->>SPA: WebSocket update
    SPA->>Card: feature.shortDescription
    SPA->>Board: feature.description
    Card->>Card: Render truncated text
    Board->>Board: Render full text
```
