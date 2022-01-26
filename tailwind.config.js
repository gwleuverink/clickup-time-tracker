
module.exports = {
    content: ["./src/**/*.{html,js,vue}"],
    theme: {
        extend: {
            animation: {
                'spin-ccw': 'reverse-spin 1s linear infinite'
            },
            keyframes: {
                'reverse-spin': {
                    from: {
                        transform: 'rotate(360deg)'
                    },
                }
            }
        },
    },
    plugins: [],
}
