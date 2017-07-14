const Header = {
  $type: 'div',
  class: 'text-center',
  $components: [{
    $type: 'h1',
    $text: 'Butterfly ILP'
  }, {
    $type: 'p',
    $text: 'Minimal ILP/SPSP client in the browser',
    class: 'lead'
  }]
}

const IlpSecretInput = {
  $type: 'div',
  class: 'form-group',
  id: 'ilp-secret-group',
  _ilpSecret: null,
  $components: [
    {
      $type: 'label',
      for: 'ilp-secret',
      class: 'control-label',
      $text: 'Your ILP Secret'
    },
    {
      $type: 'input',
      type: 'password',
      class: 'form-control',
      id: 'ilp-secret',
      placeholder: 'ilp_secret:1:...',
      $init: function () {
        IlpSecretInput._ilpSecret = localStorage.getItem('ilpSecret')
        this.value = IlpSecretInput._ilpSecret
        this.oninput()
      },
      oninput: function () {
        IlpSecretInput._ilpSecret = this.value
        if (!IlpSecretInput._ilpSecret) {
          this.focus()
          return
        }
        tryConnectUsingSecret(IlpSecretInput._ilpSecret)
          .then((result) => {
            localStorage.setItem('ilpSecret', IlpSecretInput._ilpSecret)
            UserDetails._plugin = result.plugin
            if (result.hasWebsocket) {
              console.log('Connected to ILP provider with Websocket notifications')
              IlpSecretInput._showSuccess('Connected')
            } else {
              console.log('Connected to ILP provider that does not support Websocket notifications')
              IlpSecretInput._showWarning('Connected without Websocket Notifications')
            }
          })
          .catch((err) => {
            console.error('Error connecting to ILP provider', err)
            IlpSecretInput._showError('Could not connect to ILP provider')
          })
      }
    }
  ],
  _replaceHighlightClass: function (status) {
    if (document.getElementById(this.id).class.indexOf('has-' + status) === 0) {
      return
    }
    document.getElementById(this.id).class = document.getElementById(this.id).class.replace(/ has-\w+/g, '')
    document.getElementById(this.id).class += ' has-' + status
  },
  _showWarning: function (text) {
    this._replaceHighlightClass('warning')
  },
  _showError: function (text) {
    this._replaceHighlightClass('error')
  },
  _showSuccess: function (text) {
    this._replaceHighlightClass('success')
  }
}

function tryConnectUsingSecret (ilpSecret) {
  // Check if ILP Secret is valid
  let parsed
  try {
    parsed = ILP.Secret.decode(ilpSecret)
    if (!parsed.token || !parsed.prefix || !parsed.rpcUri) {
      return Promise.reject(new Error('Invalid ILP Secret'))
    }
  } catch (err) {
    return Promise.reject(new Error('Invalid ILP Secret'))
  }

  // Try connecting to provider
  const plugin = new ILP.Plugin(parsed)
  return plugin
    .connect()
    .then(() => {
      console.log('Plugin connected')
      return Activity._connectToWebsocket(parsed)
        .then(() => {
          console.log('Connected to ILP provider')
          return {
            plugin: plugin,
            hasWebsocket: true
          }
        })
        .catch(() => {
          return {
            plugin: plugin,
            hasWebsocket: false
          }
        })
    })
}

const UserDetails = {
  $type: 'div',
  class: 'col-xs-12',
  $components:
    [
      IlpSecretInput
    ],
  _plugin: null
}

const SpspAddressInput = {
  $type: 'div',
  class: 'form-group col-xs-12',
  _spspAddress: null,
  $components: [
    {
      $type: 'label',
      for: 'spsp-address',
      $text: 'SPSP Address'
    },
    {
      $type: 'input',
      type: 'email',
      class: 'form-control',
      id: 'spsp-address',
      placeholder: 'user@ilp-kit.example',
      oninput: function () {
        SpspAddressInput._spspAddress = this.value
      },
      $update: function () {
        this.value = this._spspAddress
      }
    }
  ]
}

const MessageInput = {
  $type: 'div',
  class: 'form-group col-xs-12',
  _message: null,
  $components: [
    {
      $type: 'label',
      for: 'message',
      $text: 'Message'
    },
    {
      $type: 'input',
      type: 'text',
      class: 'form-control',
      id: 'message',
      placeholder: 'Isn\'t ILP amazing!?!?',
      oninput: function () {
        MessageInput._message = this.value
      },
      $update: function () {
        this.value = this._message
      }
    }
  ]
}

const SourceAmountInput = {
  $type: 'div',
  class: 'form-group col-xs-6',
  _sourceAmount: null,
  $components: [
    {
      $type: 'label',
      for: 'source-amount',
      $text: 'You Send'
    },
    {
      $type: 'input',
      type: 'number',
      class: 'form-control',
      id: 'source-amount',
      oninput: function () {
        SourceAmountInput._sourceAmount = this.value
        SendForm._getSourceQuote()
      },
      $update: function () {
        this.value = this._sourceAmount
      }
    }
  ]
}

const DestinationAmountInput = {
  $type: 'div',
  class: 'form-group col-xs-6',
  _destinationAmount: null,
  $components: [
    {
      $type: 'label',
      for: 'destinationAmount',
      $text: 'They Get'
    },
    {
      $type: 'input',
      type: 'number',
      class: 'form-control',
      id: 'destination-amount',
      oninput: function () {
        DestinationAmountInput._destinationAmount = this.value
        SendForm._getDestinationQuote()
      },
      $update: function () {
        this.value = this._destinationAmount
      }
    }
  ]
}

const SendButton = {
  $type: 'div',
  $components:
    [
      {
        $type: 'div',
        class: 'col-xs-4'
      },
      {
        $type: 'button',
        id: 'send-button',
        type: 'submit',
        class:  'btn btn-lg btn-primary col-xs-4',
        $text: 'Send',
        onclick: function(e) {
          e.preventDefault()
          SendForm._sendPayment()
        }
      },
      {
        $type: 'div',
        class: 'col-xs-4'
      }
    ],
  _changeClass: function (status) {
    const button = document.getElementById(this.$components[1].id)
    button.class = button.class.replace(/btn-\w{3,}/g, 'btn-' + status)
  },
  _showSuccess: function () {
    this._changeClass('success')
    const _this = this
    setTimeout(function () {
      _this._changeClass('primary')
    }, 1000)
  },
  _showError: function () {
    this._changeClass('danger')
    const _this = this
    setTimeout(function () {
      _this._changeClass('primary')
    }, 1000)
  }
}

const SendForm = {
  $type: 'div',
  id: 'send-form',
  //class: 'container-fluid',
  _spspAddress: null,
  _message: null,
  _sourceAmount: null,
  _destinationAmount: null,
  $components:
    [
      {
        $type: 'form',
        $components:
          [
            {
              $type: 'form',
              $components:
                [
                  SpspAddressInput,
                  MessageInput,
                  SourceAmountInput,
                  DestinationAmountInput,
                  SendButton
                ]
            }
          ]
      }
    ],
  _quote: null,
  _getSourceQuote: function () {
    if (!IlpSecretInput._ilpSecret) {
      IlpSecretInput._showError('ILP Secret is required')
      document.getElementById(IlpSecretInput.$components[1].id).focus()
      this._quote = null
      return
    }
    if (!SpspAddressInput._spspAddress) {
      document.getElementById(SpspAddressInput.$components[1].id).focus()
      this._quote = null
      return
    }
    if (!SourceAmountInput._sourceAmount) {
      this._quote = null
      return
    }
    console.log('Getting quote to ' + SpspAddressInput._spspAddress + ' for source amount: ' + SourceAmountInput._sourceAmount)
    ILP.SPSP.quote(UserDetails._plugin, {
        receiver: SpspAddressInput._spspAddress,
        sourceAmount: SourceAmountInput._sourceAmount
    })
      .then((quote) => {
        this._quote = quote
        DestinationAmountInput._destinationAmount = quote.destinationAmount
      })
      .catch((err) => {
        console.error('Error getting quote', err)
      })
  },
  _getDestinationQuote: function () {
    if (!SpspAddressInput._spspAddress) {
      document.getElementById(SpspAddressInput.$components[1].id).focus()
      this._quote = null
      return
    }
    if (!DestinationAmountInput._destinationAmount) {
      this._quote = null
      return
    }
    console.log('Getting quote to ' + SpspAddressInput._spspAddress + ' for destination amount: ' + DestinationAmountInput._destinationAmount)
    ILP.SPSP.quote(UserDetails._plugin, {
        receiver: SpspAddressInput._spspAddress,
        destinationAmount: DestinationAmountInput._destinationAmount
    })
      .then((quote) => {
        this._quote = quote
        SourceAmountInput._sourceAmount = quote.sourceAmount
      })
      .catch((err) => {
        console.error('Error getting quote', err)
      })
  },
  _sendPayment: function () {
    if (!this._quote) {

    }
    this._quote.message = MessageInput._message
    this._quote.disableEncryption = true
    this._quote.headers = {
      'Source-Name': 'Butterfly ILP',
      'Source-Image-Url': 'https://i.imgur.com/6g9ORud.jpg',
      'Message': MessageInput._message
    }
    console.log('Sending SPSP payment', this._quote)
    ILP.SPSP.sendPayment(plugin, this._quote)
      .then((result) => {
        console.log('Sent payment', result)
        SendButton._showSuccess()
      })
      .catch((err) => {
        console.log('Error sending payment', err)
        SendButton._showError()
      })
  }
}

const Activity = {
  $components: [],
  class: 'activity list-group',
  $type: 'ul',
  _ws: null,
  _add: function (data) {
    this.$components = [makeActivityItem(data)].concat(this.$components).slice(0,20)
  },
  _connectToWebsocket: function (parsedIlpSecret) {
    return Promise.resolve()
      .then((parsedIlpSecret) => {
        const uri = ILP.URL.parse(parsedIlpSecret.rpcUri)
        const protocol = parsedIlpSecret.protocol === 'https' ? 'wss' : 'ws'
        const connectionString = parsedIlpSecret.connectionString
          .replace('http', 'ws')
        const websocketUri = ILP.URL.format({
          protocol: uri.protocol.replace('http', 'ws'),
          hostname: uri.hostname,
          // TODO don't hardcode the port
          port: 8081,
          path: '/ws',
          query: {
            prefix: parsedIlpSecret.prefix,
            token: parsedIlpSecret.token
          }
        })

        this._ws = new WebSocket(websocketUri)
        this._ws.addEventListener('message', function (event) {
          this._add(JSON.parse(event.data))
        })

        return new Promise((resolve, reject) => {
          setTimeout(reject.bind(null, new Error('Websocket connection timed out')), 5000)
          this._ws.addEventListener('open', function () {
            resolve()
          })
          this._ws.addEventListener('error', function () {
            reject()
          })
        })
      })
  }
}

function makeActivityItem (transfer) {
  const item = {
    class: 'item hidden',
    $init: function () {
      this.className = 'item'
    },
    $components: [{
      $type: 'li',
      class: 'list-group-item',
      $components: [{
        $type: 'p',
        class: 'lead',
        $text: transfer.expiresAt + ' transfer from ' + transfer.from + ' to ' + transfer.to + ' for ' + transfer.amount
      }, {
        $type: 'p',
        $text: 'transfer id: ' + transfer.id
      }, {
        $type: 'p',
        $text: 'ilp packet: ' + transfer.ilp
      }]
    }]
  }
  return item
}

// Main cell
ಠᴥಠ = {
  $cell: true,
  class: 'container-fluid',
  $components: [
    {
      $type: 'div',
      class: 'row',
      $components: [
        {
          $type: 'div',
          class: 'col-xs-3'
        },
        {
          $type: 'form',
          class: 'col-xs-6',
          $components:
            [
              Header,
              UserDetails,
              SendForm,
              Activity
            ]
        },
        {
          $type: 'div',
          class: 'col-xs-3'
        }
      ]
    }
  ]
}

