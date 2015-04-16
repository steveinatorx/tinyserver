'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    nodeunit: {
      files: ['test/**/*.spec.js'],
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      lib: {
        src: ['lib/**/*.js']
      },
      test: {
        src: ['test/**/*.js']
      },
    },
    watch: {
     lib: {
        files: ['Gruntfile.js','lib/*.js'],
        tasks: ['express:dev'],
        options: {
          spawn: false
        }
      },
/*
      test: {
        files: '<%= jshint.test.src %>',
        tasks: ['jshint:test', 'nodeunit', 'express:dev'],
          options: {
            spawn: false
          } 
      },
*/
    },
    express: {
      options: {
        // Override defaults here 
        showStack: true
      },
      dev: {
        options: {
          script: 'lib/tinyserver.js'
        }
      },
      prod: {
        options: {
          script: 'path/to/prod/server.js',
          node_env: 'production'
        }
      },
      test: {
        options: {
          script: 'path/to/test/server.js'
        }
      }
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-express-server');

  grunt.registerTask('foo','bar',function(){

    grunt.log.writeln('tick tick tick');

  });

 /* grunt.registerTask('express-keepalive', 'Keep grunt running', function() {
    this.async();
  });*/
  // Default task.
  grunt.registerTask('default', ['jshint', 'nodeunit']);
  grunt.registerTask('serve', ['jshint','express:dev', 'watch']);
};
