import React, { Component } from 'react'
import * as R from 'ramda'
import { PropTypes as T } from 'prop-types'
import Dialog from '@material-ui/core/Dialog'
import DialogActions from '@material-ui/core/DialogActions'
import DialogContent from '@material-ui/core/DialogContent'
import DialogContentText from '@material-ui/core/DialogContentText'
import DialogTitle from '@material-ui/core/DialogTitle'
import Divider from '@material-ui/core/Divider'
import Button from '@material-ui/core/Button'
import Typography from '@material-ui/core/Typography'
import Checkbox from '@material-ui/core/Checkbox'
import Hidden from '@material-ui/core/Hidden'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import { withStyles } from '@material-ui/core/styles'
import withContainer from './container'
import withMobileDialog from '@material-ui/core/withMobileDialog'
import SendIcon from '@material-ui/icons/SendOutlined'

const styles = (theme) => ({
  divider: {
    marginBottom: theme.spacing.unit * 2
  },
  icon: {
    marginRight: theme.spacing.unit
  },
  link: {
    color: theme.palette.primary.light,
    textDecoration: 'none'
  }
})

class Help extends Component {
  state = {
    open: false,
    wantsNotToShowSplashAgain: false
  }

  componentWillReceiveProps ({ isHelpDisplayed: newIsHelpDisplayed }) {
    const { isHelpDisplayed } = this.props
    if (newIsHelpDisplayed && newIsHelpDisplayed !== isHelpDisplayed) {
      this.handleOpen()
    }
  }

  componentDidMount () {
    const doNotShowSplash = window.localStorage.getItem('do-not-show-splash')
    if (!doNotShowSplash) {
      this.handleOpen()
    }
  }

  handleOpen = () => this.setState({ open: true })

  handleClose = () => {
    this.setState({ open: false })
    setTimeout(this.props.hideHelp, 300) // TO DO: Improve system of helper (setTimeout can be avoided)
  }

  handleCheckboxChange = event => {
    const checked = event.target.checked
    checked
      ? window.localStorage.setItem('do-not-show-splash', true)
      : window.localStorage.removeItem('do-not-show-splash')
    this.setState({ wantsNotToShowSplashAgain: checked })
  }

  render () {
    const { open, wantsNotToShowSplashAgain } = this.state
    const { classes, fullScreen, isHelpDisplayed } = this.props
    return (
      <Dialog
        fullScreen={fullScreen}
        open={open}
        onClose={this.handleClose}
        maxWidth="md"
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {isHelpDisplayed ? 'Help' : 'Welcome to Diadem Network!'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText component="div" id="alert-dialog-description">
            <Typography paragraph color="textPrimary">
              Diadem Network leverages blockchain technology from DECENT and FACEBOOK. You can be an achiever and/or a sponsor.
            </Typography>
            <Divider className={classes.divider} />
            <Typography color="textPrimary" variant="title">
              Achiever
            </Typography>
            <Typography paragraph variant="body2">
              Fighting for the planet? Helping people out? But you need a boost? Get financial support using Diadem Network!
            </Typography>
            <Typography variant="subheading">
              1. Publish a Facebook post explaining your achievement (with text, picture(s), video(s)).
            </Typography>
            <Typography variant="subheading">
              2. CREATE YOUR ACHIEVEMENT on Diadem Network with the link to your Facebook post.
            </Typography>
            <Typography variant="subheading" paragraph>
              3. WITHDRAW DCT tokens you receive from others supporting your great actions!
            </Typography>
            <Typography paragraph variant="subheading">
              Note you can UPDATE YOUR ACHIEVEMENT if it evolves. Available only if you created one.
            </Typography>
            <Divider className={classes.divider} />
            <Typography variant="title">
              Sponsor
            </Typography>
            <Typography paragraph variant="body2">
              You want to financially support people helping the world?
            </Typography>
            <Typography variant="subheading">
              - CONFIRM achievements you know are real.
            </Typography>
            <Typography variant="subheading">
              - You want to give immediate SUPPORT ? You can send DCT tokens right away.
            </Typography>
            <Typography paragraph variant="subheading">
              - You prefer waiting for someone you choose to confirm the achievement ? Then DEPOSIT DCT tokens. They will not be transferred until he does.
            </Typography>
            <Divider className={classes.divider} />
            <Typography color="textSecondary">
              - Facebook Login is required to perform most actions.
            </Typography >
            <Typography color="textSecondary">
              - Adblockers seems to cause a Facebook login bug. Please desactivate them to use DiademNetwork.
            </Typography >
            <Typography color="textSecondary">
              - A hot wallet is used to manage DECENT transactions.
            </Typography>
            <Typography color="textSecondary">
              - Please do not use hot wallet to store large amount of DCT tokens.
            </Typography>
            <Typography color="textSecondary">
              - Creating, Updating and Confirming achievements are free.
            </Typography>
            <Typography color="textSecondary">
              - Supporting, Depositing and Withdrawing require DCT tokens.
            </Typography>
            <Typography color="textSecondary">
              - Check official DECENT user guide here to know how to send DCT tokens to your hot wallet.
            </Typography>
            <Typography color="textSecondary" paragraph>
              - NEVER EVER lose privateKey/mnemonic you are given at first login. If you lose it, you lose funds inside.
            </Typography>
            <Typography paragraph variant="title">
              #diademnetwork
            </Typography>
            <Typography variant="caption">
              If you need more help, have questions, improvements ideas, or just want to say hello, don't hesitate contacting us at: <a className={classes.link} target="_blank" href={`mailto:${process.env.SUPPORT_CONTACT_EMAIL}`}>{process.env.SUPPORT_CONTACT_EMAIL}</a>
            </Typography>
            {!isHelpDisplayed &&
            <FormControlLabel
              control={
                <Checkbox
                  color="secondary"
                  checked={wantsNotToShowSplashAgain}
                  onChange={this.handleCheckboxChange}
                />
              }
              label="I do not want to see this help again in the future"
            />
            }
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            aria-label="Go to application"
            color="secondary"
            onClick={this.handleClose}
            variant={fullScreen ? 'contained' : 'extendedFab'}
          >
            <Hidden smDown>
              <SendIcon className={classes.icon} />
            </Hidden>
            {isHelpDisplayed ? 'Go back to Diadem Network' : ' Get me to Diadem Network'}
          </Button>
        </DialogActions>
      </Dialog>
    )
  }
}

Help.propTypes = {
  classes: T.object,
  fullScreen: T.bool,
  isHelpDisplayed: T.bool,
  hideHelp: T.func
}

export default R.compose(
  withMobileDialog(),
  withContainer,
  withStyles(styles)
)(Help)