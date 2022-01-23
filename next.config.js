module.exports = {
  target: 'serverless',
  images: {
    loader: 'akamai',
    path: '',
  },
  webpack: function (config) {
    config.module.rules.push({
      test: /\.md$/,
      use: 'raw-loader',
    })
    return config
  },
}