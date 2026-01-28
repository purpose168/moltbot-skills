package cmd

import (
	"github.com/spf13/cobra"
	"github.com/visionik/ecto/internal/config"
)

var imageCmd = &cobra.Command{
	Use:   "image",
	Short: "管理图片",
}

var imageUploadCmd = &cobra.Command{
	Use:   "upload <path>",
	Short: "上传图片",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		client, err := config.GetActiveClient(siteName)
		if err != nil {
			return err
		}

		asJSON, _ := cmd.Flags().GetBool("json")

		resp, err := client.UploadImage(args[0])
		if err != nil {
			return err
		}

		if asJSON {
			return outputJSON(resp)
		}

		if len(resp.Images) > 0 {
			printf("已上传: %s\n", resp.Images[0].URL)
		}
		return nil
	},
}

func init() {
	imageUploadCmd.Flags().Bool("json", false, "以JSON格式输出")

	imageCmd.AddCommand(imageUploadCmd)
	rootCmd.AddCommand(imageCmd)
}
