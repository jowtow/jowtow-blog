import Layout from '../components/Layout'
import PostList from '../components/PostList'
import matter from 'gray-matter'

const Index = ({ title, description, ...props }) => {
  return (
    <Layout pageTitle={title}>
      <h1 className="title">Post Archive</h1>
      <main>
        <PostList posts={props.posts} />
      </main>
    </Layout>)
}

export default Index

export async function getStaticProps() {
  const configData = await import(`../siteconfig.json`)

  const posts = ((context) => {
    const keys = context.keys()
    const values = keys.map(context)

    const data = keys.map((key, index) => {
      let slug = key.replace(/^.*[\\\/]/, '').slice(0, -3)
      const value = values[index]
      const document = matter(value.default)
      return {
        frontmatter: document.data,
        markdownBody: document.content,
        slug,
      }
    })
    return data
  })(require.context('../posts', true, /\.md$/))

debugger;
  return {
    props: {
      posts: posts.sort((a, b) => (Date.parse(a.frontmatter.date) < Date.parse(b.frontmatter.date)) ? 1 : -1),
      title: configData.default.title,
      description: configData.default.description,
    },
  }
}