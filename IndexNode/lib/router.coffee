Router.configure
  layoutTemplate: 'main'


Router.route '/', (->
  @render 'welcome'
  return
  ), name: 'welcome'


Router.route '/allFiles', (->
  @render 'displayFiles'
  return
  ), name: 'displayFiles'


Router.route '/file/:_id', (->
  file = Files.findOne(_id: @params._id)
  @render 'FileDetails', data: file
  return
  ), name: 'FileDetails'



