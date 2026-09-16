export default defineAppConfig({
    ui: {
        colors: {
            primary: 'blue'
        },
        main: {
            base: 'min-h-[calc(100vh-var(--ui-header-height))] bg-gray-100'
        },
        header: {
            slots: {
                root: 'h-28'
            }
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
