Router.configure
  layoutTemplate: 'main'


Router.route '/', (->
  @render 'welcome'
  return
  ), name: 'welcome'


Router.route '/startQuery', (->
  @render 'startQuery'
  return
  ), name: 'startQuery'


# Router.route '/file/:_id', (->
#   file = Files.findOne(_id: @params._id)
#   @render 'FileDetails', data: file
#   return
#   ), name: 'FileDetails'



