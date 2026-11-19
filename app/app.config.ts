export default defineAppConfig({
    ui: {
        colors: {
            primary: 'azure',
            secondary: 'sage',
            neutral: 'navy'
        },
        main: {
            base: 'min-h-[calc(100vh-var(--ui-header-height))]'
        },
        navigationMenu: {
            compoundVariants: [{
                orientation: 'vertical',
                collapsed: true,
                class: {
                    link: 'flex-col',
                    linkLabel: 'block text-[10px]/3 text-center'
                }
            }]
        }
    }
})
