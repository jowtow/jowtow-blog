import Layout from '../components/Layout'
import styles from './about.module.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAddressCard, faBriefcase, faMusic, faPaintBrush } from '@fortawesome/free-solid-svg-icons'
import { faGithub, faLinkedin, faYoutube, faSpotify, faStackOverflow, faTwitter } from '@fortawesome/free-brands-svg-icons'


const About = ({ title, description, professionalDescription, music, crafts,  ...props }) => {
  return (
    <>
      <Layout pageTitle={`${title} | About`} description={description}>
        <div className={styles.aboutContainer}>

          <div className={styles.author}>
            <img
              className={styles.authorImage}
              src="/Author.jpg"
              alt="Picture of the author."
            />
            <span>John Townsend</span>
          </div>
          <div className={styles.descriptions}>
            <div className={styles.description}>
              <FontAwesomeIcon icon={faAddressCard} />
              <p>{description}</p>
            </div>
            <div className={styles.description}>
              <FontAwesomeIcon icon={faBriefcase} />
              <p>{professionalDescription}</p>
            </div>
            <div className={styles.description}>
              <FontAwesomeIcon icon={faMusic} />
              <p>{music}</p>
            </div>
            <div className={styles.description}>
              <FontAwesomeIcon icon={faPaintBrush} />
              <p>{crafts}</p>
            </div>
          </div>
          <div className={styles.links}>
            <a href="https://github.com/JohnWTownsend" target="_blank"><FontAwesomeIcon icon={faGithub} /></a>
            <a href="https://stackoverflow.com/users/8167458/john-townsend" target="_blank"><FontAwesomeIcon icon={faStackOverflow} /></a>
            <a href="https://www.linkedin.com/in/johntownsend/" target="_blank"><FontAwesomeIcon icon={faLinkedin} /></a>
            <a href="https://www.youtube.com/channel/UCVxiiiRO17Sl95I0cctdfjg" target="_blank"><FontAwesomeIcon icon={faYoutube} /></a>
            <a href="https://open.spotify.com/user/1226496424?si=a0b619d607b9491e" target="_blank"><FontAwesomeIcon icon={faSpotify} /></a>
            <a href="https://twitter.com/jowtow" target="_blank"><FontAwesomeIcon icon={faTwitter} /></a>
          </div>
        </div>
      </Layout>
    </>
  )
}

export default About

export async function getStaticProps() {
  const configData = await import(`../siteconfig.json`)

  return {
    props: {
      title: configData.default.title,
      description: configData.default.description,
      professionalDescription: configData.default.professionalDescription,
      music: configData.default.music,
      crafts: configData.default.crafts,
    },
  }
}