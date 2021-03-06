module.exports = {
    /**
     * Application configuration section
     * http://pm2.keymetrics.io/docs/usage/application-declaration/
     */
    apps: [
        // First application
        {
            name: 'www',
            script: './bin/www',
            'instances': '1',
            'exec_mode': 'cluster',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: 'pm2_err_log/pm2_err.log',
            //out_file: 'pm2_out_log/pm2_out.log',
        }
    ]

    /**
     * Deployment section
     * http://pm2.keymetrics.io/docs/usage/deployment/
     */
};
