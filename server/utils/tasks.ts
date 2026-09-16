export interface Task {
    id: number
    title: string
    description: string
    height: number
}

export const tasks: Task[] = [
    { id: 1, title: 'Tasks 1', description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.', height: 160 },
    { id: 2, title: 'Tasks 2', description: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui.', height: 227 },
    { id: 3, title: 'Tasks 3', description: 'Nulla vitae elit libero, a pharetra augue mollis interdum.', height: 294 },
    { id: 4, title: 'Tasks 4', description: 'Vestibulum id ligula porta felis euismod semper.', height: 361 },
    { id: 5, title: 'Tasks 5', description: 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', height: 208 },
    { id: 6, title: 'Tasks 6', description: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.', height: 275 },
    { id: 7, title: 'Tasks 7', description: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.', height: 342 },
    { id: 8, title: 'Tasks 8', description: 'Curabitur blandit tempus porttitor.', height: 189 },
]
