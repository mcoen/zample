# Zample Object Model

This document captures the current object model implemented in the Zample app and services.

## Diagram

![Zample Object Model](./object-model.svg)

## Mermaid Source

```mermaid
classDiagram
direction LR

class Launch {
  +string id
  +string title
  +string owner
  +LaunchStage stage
  +LaunchPriority priority
  +LaunchRisk riskLevel
  +string? dueDate
  +string description
  +LaunchStatus status
  +string workspaceId
  +string workspaceName
  +string workspaceType
  +string category
  +string brand
  +string market
  +string createdAt
  +string updatedAt
}

class Participant {
  +string id
  +string name
  +string role
  +string email
}

class Task {
  +string id
  +string title
  +string description
  +string assignee
  +string? dueDate
  +TaskPriority priority
  +string taskType
  +string? projectId
  +TaskStatus status
  +string createdAt
  +string updatedAt
}

class ChatMessage {
  +string id
  +string sender
  +string[] recipients
  +string text
  +string createdAt
}

class UserProfile {
  +string fullName
  +string email
  +string role
}

class AuthSession {
  +string cookieName = zample_session
  +string value = active
  +int maxAgeSeconds = 43200
  +string sameSite = lax
}

class LaunchStage {
  <<enumeration>>
  Intake
  In Validation
  Pilot
  Production
}

class LaunchPriority {
  <<enumeration>>
  Low
  Medium
  High
  Urgent
}

class LaunchRisk {
  <<enumeration>>
  Low
  Medium
  High
}

class LaunchStatus {
  <<enumeration>>
  active
  archived
}

class TaskStatus {
  <<enumeration>>
  todo
  in_progress
  done
}

class TaskPriority {
  <<enumeration>>
  Low
  Medium
  High
}

Launch "1" o-- "0..*" Participant : stakeholders
Launch "1" --> "0..*" Task : tasks
Launch "1" --> "0..*" ChatMessage : chatByLaunch[launchId]
ChatMessage "1" --> "1..*" Participant : recipients
Task ..> Participant : assignee (by name)

Launch --> LaunchStage : stage
Launch --> LaunchPriority : priority
Launch --> LaunchRisk : riskLevel
Launch --> LaunchStatus : status
Task --> TaskStatus : status
Task --> TaskPriority : priority

AuthSession ..> UserProfile : authenticated user context
AuthSession ..> Launch : authorizes /launches route
```

## Notes

- `Launch` maps to the API/service `Project` shape and is persisted in `services/projects-service/data/projects.json`.
- `Task` maps to the API/service `Task` shape and is persisted in `services/tasks-service/data/tasks.json`.
- `Participant` maps to `LaunchParty` and is embedded inside each `Launch` as `stakeholders`.
- `ChatMessage` and `UserProfile` are currently UI-level state models.
- `AuthSession` is currently cookie-based (`zample_session`) and enforced by Next.js middleware.
