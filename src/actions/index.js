import api from '../services/api'
import * as R from 'ramda'
import notifications from '../services/notifications'
import types from './types'

import * as dcore from 'dcorejs'

const chainId = '9c54faed15d4089d3546ac5eb0f1392434a970be15f1452ce1e7764f70f02936'
const dcoreNetworkWSPaths = ['wss://hackathon2.decent.ch:8090']
dcore.initialize({ chainId, dcoreNetworkWSPaths }, false)
const connection = dcore.connection()
connection.openConnection().then((res) => {
  console.log(connection.isConnected)
}).catch((error) => {
  console.error(error)
})

const ADDRESS_PREFIX = 'ddm'

const {
  ASYNC_ACHIEVEMENT_CONFIRM,
  ASYNC_ACHIEVEMENT_CREATE,
  ASYNC_ACHIEVEMENT_SUPPORT,
  ASYNC_ACHIEVEMENT_DEPOSIT,
  ASYNC_ACHIEVEMENT_UPDATE,
  ASYNC_USERS_FETCH,
  ACHIEVEMENTS_UPDATE_DATA,
  TRANSACTIONS_UPDATE_DATA,
  ACHIEVEMENTS_UPDATE_META,
  TRANSACTIONS_UPDATE_META,
  UI_SHOW_HELP,
  UI_HIDE_HELP,
  WALLET_UPDATE_DATA,
  WALLET_UPDATE_META,
  WALLET_UPDATE_STATUS,
  FACEBOOK_UPDATE_DATA,
  FACEBOOK_UPDATE_AUTHENTICATION_STATUS
} = types

// Facebook
export const updateFacebook = (data) => ({ type: FACEBOOK_UPDATE_DATA, data })
export const updateFacebookAuthenticationStatus = (status) => ({ type: FACEBOOK_UPDATE_AUTHENTICATION_STATUS, status })

// Wallet
export const updateWallet = (data) => ({ type: WALLET_UPDATE_DATA, data })
export const updateWalletMeta = (meta) => ({ type: WALLET_UPDATE_META, meta })
export const updateWalletStatus = (status) => ({ type: WALLET_UPDATE_STATUS, status })

const getWalletInfo = async (userID) => {
  const accountName = `${ADDRESS_PREFIX}-${userID}`
  const accountId = (await dcore.account().getAccountByName(accountName)).id
  const balance = await dcore.account().getBalance(accountId)
  const transactions = []
  return { addrStr: accountName, accountId, balance, transactions }
}

export const refreshWallet = (addrStr) => async (dispatch, getState) => {
  const userID = addrStr.replace(`${ADDRESS_PREFIX}-`, '')
  try {
    const walletData = await getWalletInfo(userID)
    const { wallet: { data } } = getState()
    if (R.complement(R.equals)(data, walletData)) {
      dispatch(updateWallet(walletData))
    }
  } catch (error) {
    dispatch(notifications.walletRefreshError)
  }
}

export const checkUserAddressAndLoadWallet = ({ walletData, privateKey, userID }) => async (dispatch) => {
  const { data: { exists } } = await api.checkUserAddress({ user: userID, walletAddress: walletData.addrStr })
  if (exists) {
    const privateKeyWif = privateKey.stringKey
    dispatch(updateWallet(walletData))
    dispatch(updateWalletMeta({ privateKey: privateKeyWif }))
    dispatch(notifications.walletRestored)
    dispatch(updateWalletStatus('restored'))
  } else {
    dispatch(updateWalletStatus('recover-failed'))
  }
}

export const recoverWallet = ({ mnemonic, privateKey }) => async (dispatch, getState) => {
  try {
    let privateKeyRestored
    const { facebook: { data: { userID } } } = getState()
    if (privateKey) {
      privateKeyRestored = dcore.KeyPrivate.fromWif(privateKey)
    } else if (mnemonic) {
      privateKeyRestored = dcore.KeyPrivate.fromBrainKey(mnemonic)
    } else {
      throw new Error()
    }
    const privateKeyWif = privateKeyRestored.stringKey
    window.localStorage.setItem(`privateKey-${userID}`, privateKeyWif)
    const walletData = await getWalletInfo(userID)
    await checkUserAddressAndLoadWallet({ walletData, privateKey, userID })(dispatch)
  } catch (error) {
    dispatch(notifications.walletRecoverError)
  }
}

export const checkUserRegistration = () => async (dispatch, getState) => {
  try {
    const { facebook: { data: { userID } } } = getState()
    dispatch(updateWalletMeta({
      isRegistrationPending: false,
      isUserRegistered: true
    }))
    dispatch(notifications.userRegistrationSuccess)
    await loadWallet(userID)(dispatch)
  } catch (error) {
    dispatch(notifications.checkUserError)
  }
}

export const loadWallet = (userID) => async (dispatch) => {
  try {
    const storedPrivateKey = window.localStorage.getItem(`privateKey-${userID}`)
    if (!storedPrivateKey) {
      dispatch(updateWalletStatus('needs-recovering'))
    } else {
      const privateKey = dcore.KeyPrivate.fromWif(storedPrivateKey)
      const walletData = await getWalletInfo(userID)
      await checkUserAddressAndLoadWallet({ walletData, privateKey, userID })(dispatch)
    }
  } catch (error) {
    console.error(error)
    dispatch(notifications.walletError)
    dispatch(updateWalletStatus('error'))
  }
}

const registerUser = async ({ accessToken, name, userID }, dispatch) => {
  const mnemonic = dcore.Utils.suggestBrainKey()
  const [privateKey, publicKey] = dcore.Utils.generateKeys(mnemonic)
  const privateKeyWif = privateKey.stringKey
  const publicKeyRaw = publicKey.stringKey
  window.localStorage.setItem(`privateKey-${userID}`, privateKeyWif)
  dispatch(updateWalletMeta({ mnemonic, privateKey: privateKeyWif }))
  dispatch(updateWalletMeta({ privateKey: privateKeyWif }))
  const addrStr = `${ADDRESS_PREFIX}-${userID}`
  await api.registerUser({
    publicKey: publicKeyRaw,
    address: addrStr,
    name,
    user: userID,
    token: accessToken
  })
  dispatch(updateWallet({ addrStr }))
  dispatch(updateWalletStatus('generated'))
  dispatch(notifications.walletGenerated)
}

export const handleFacebookLogin = (facebookData) => async (dispatch) => {
  try {
    dispatch(updateFacebook(facebookData))
    dispatch(updateFacebookAuthenticationStatus('succeeded'))
    dispatch(notifications.facebookLoginSuccess)
    const { accessToken, name, userID } = facebookData
    const { data: { exists } } = await api.checkUser({ user: userID })
    if (exists) {
      dispatch(updateWalletMeta({ isUserRegistered: true }))
      return loadWallet(userID)(dispatch)
    } else {
      return registerUser({ accessToken, name, userID }, dispatch)
    }
  } catch (error) {
    dispatch(notifications.checkUserError)
  }
}

export const updateAchievementsSuccess = (data) => async dispatch => {
  dispatch({ type: ACHIEVEMENTS_UPDATE_DATA, data })
}

export const updateAchievementsFail = () => async dispatch => {
  dispatch(notifications.fetchAchievementsError)
}

export const updateTransactionsSuccess = (data) => async dispatch => {
  dispatch({ type: TRANSACTIONS_UPDATE_DATA, data })
}

export const updateTransactionsFail = () => async dispatch => {
  dispatch(notifications.fetchTransactionsError)
}

export const confirmAchievement = ({ address, link, token, user, wallet, name }) => async dispatch => {
  try {
    dispatch({ type: ASYNC_ACHIEVEMENT_CONFIRM.requested })
    await api.confirmAchievement({ address, link, token, user, wallet, name })
    dispatch({ type: ASYNC_ACHIEVEMENT_CONFIRM.succeeded })
    dispatch(notifications.confirmAchievementSuccess)
  } catch (error) {
    dispatch(notifications.confirmAchievementError)
    dispatch({ type: ASYNC_ACHIEVEMENT_CONFIRM.failed, payload: { error } })
  }
}

export const supportAchievement = ({ amount, fees, link, recipientWalletAddress }) => async (dispatch, getState) => {
  try {
    dispatch({ type: ASYNC_ACHIEVEMENT_SUPPORT.requested })
    const { wallet: { data: { addrStr }, meta: { privateKey } } } = getState()
    const fromAccount = addrStr
    const toAccount = recipientWalletAddress
    await dcore.account().transfer(amount, '', fromAccount, toAccount, '', privateKey, true)
    dispatch({ type: ASYNC_ACHIEVEMENT_SUPPORT.succeeded })
    dispatch(notifications.supportAchievementSuccess)
  } catch (error) {
    dispatch(notifications.supportAchievementError)
    dispatch({ type: ASYNC_ACHIEVEMENT_SUPPORT.failed, payload: { error } })
  }
}

export const depositForAchievement = ({
  amount,
  fees,
  link,
  witnessAddress,
  witnessName,
  witnessUserID
}) => async (dispatch, getState) => {
  try {
    dispatch({ type: ASYNC_ACHIEVEMENT_DEPOSIT.requested })
    const { facebook, wallet } = getState()
    const { data: { address, encodedData } } = await api.encodeDeposit({ link, witness: witnessAddress })
    const rawTx = await wallet.meta.wallet.generateContractSendTx(address, encodedData, {
      amount: amount * 1e8,
      feeRate: fees
    })
    const { accessToken, userID } = facebook.data
    await api.depositForAchievement({
      address: wallet.data.addrStr,
      link,
      rawTx,
      token: accessToken,
      user: userID,
      witness: witnessUserID,
      witnessName
    })
    dispatch({ type: ASYNC_ACHIEVEMENT_DEPOSIT.succeeded })
    dispatch(notifications.depositAchievementSuccess)
  } catch (error) {
    dispatch({ type: ASYNC_ACHIEVEMENT_DEPOSIT.failed, payload: { error } })
    dispatch(notifications.depositAchievementError)
  }
}

export const createAchievement = (payload) => async (dispatch, getState) => {
  try {
    dispatch({ type: ASYNC_ACHIEVEMENT_CREATE.requested })
    const { link, title } = payload
    const { facebook, wallet } = getState()
    const { accessToken, name, userID } = facebook.data
    const { addrStr } = wallet.data
    await api.createAchievement({
      address: addrStr,
      link,
      name,
      previousLink: '',
      title,
      token: accessToken,
      user: userID
    })
    dispatch({ type: ASYNC_ACHIEVEMENT_CREATE.succeeded })
    dispatch(notifications.createAchievementSuccess)
  } catch (error) {
    dispatch(notifications.createAchievementError)
    dispatch({ type: ASYNC_ACHIEVEMENT_CREATE.failed, payload: { error } })
  }
}

export const updateAchievement = (payload) => async (dispatch, getState) => {
  try {
    dispatch({ type: ASYNC_ACHIEVEMENT_UPDATE.requested })
    const { link, title, previousLink } = payload
    const { facebook, wallet } = getState()
    const { accessToken, name, userID } = facebook.data
    const { addrStr } = wallet.data
    await api.updateAchievement({
      address: addrStr,
      link,
      name,
      previousLink,
      title,
      token: accessToken,
      user: userID
    })
    dispatch({ type: ASYNC_ACHIEVEMENT_UPDATE.succeeded })
    dispatch(notifications.updateAchievementSuccess)
  } catch (error) {
    dispatch(notifications.updateAchievementError)
    dispatch({ type: ASYNC_ACHIEVEMENT_UPDATE.failed, payload: { error } })
  }
}

export const updateTransactionsMeta = (meta) => ({ type: TRANSACTIONS_UPDATE_META, meta })
export const updateAchievementsMeta = (meta) => ({ type: ACHIEVEMENTS_UPDATE_META, meta })

export const displayNotification = (notification) => (dispatch) => {
  dispatch(notification)
}

export const withdrawFromHotWallet = ({address, amount, fees}) => async (dispatch, getState) => {
  try {
    const { wallet: { data: { addrStr }, meta: { privateKey } } } = getState()

    const fromAccount = addrStr
    const toAccount = address
    await dcore.account().transfer(amount, '', fromAccount, toAccount, '', privateKey, true)
    dispatch(notifications.withdrawTokensSuccess)
  } catch (error) {
    dispatch(notifications.withdrawTokensError)
  }
}

// Ui
export const showHelp = () => ({ type: UI_SHOW_HELP })
export const hideHelp = () => ({ type: UI_HIDE_HELP })

// Users
export const fetchUsers = () => async (dispatch) => {
  try {
    const { data: { usersList } } = await api.fetchUsers()
    dispatch({ type: ASYNC_USERS_FETCH.succeeded, data: usersList })
  } catch (error) {
    dispatch({ type: ASYNC_USERS_FETCH.failed, payload: { error } })
    dispatch(notifications.fetchUsersError)
  }
}

export const checkLastUserTransactions = (transactions) => async (dispatch) => {
  let hasPendingTransactions = false
  dispatch(updateWalletMeta({ hasPendingTransactions }))
}
